import { strict as assert } from 'node:assert/strict'
import * as accounts_following from '../../functions/api/v1/accounts/[id]/following'
import * as accounts_featured_tags from '../../functions/api/v1/accounts/[id]/featured_tags'
import * as accounts_lists from '../../functions/api/v1/accounts/[id]/lists'
import * as accounts_relationships from '../../functions/api/v1/accounts/relationships'
import * as accounts_followers from '../../functions/api/v1/accounts/[id]/followers'
import * as accounts_follow from '../../functions/api/v1/accounts/[id]/follow'
import * as accounts_unfollow from '../../functions/api/v1/accounts/[id]/unfollow'
import { instanceConfig } from 'wildebeest/config/instance'
import * as accounts_statuses from '../../functions/api/v1/accounts/[id]/statuses'
import * as accounts_get from '../../functions/api/v1/accounts/[id]'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from '../utils'
import * as accounts_verify_creds from '../../functions/api/v1/accounts/verify_credentials'
import { createPerson } from 'wildebeest/activitypub/actors'
import { addFollowing, acceptFollowing } from 'wildebeest/activitypub/actors/follow'

const userKEK = 'test_kek2'

describe('Mastodon APIs', () => {
    describe('accounts', () => {
        beforeEach(() => {
            globalThis.fetch = async (input: RequestInfo) => {
                if (input.toString() === 'https://remote.com/.well-known/webfinger?resource=acct%3Asven%40remote.com') {
                    return new Response(
                        JSON.stringify({
                            links: [
                                {
                                    rel: 'self',
                                    type: 'application/activity+json',
                                    href: 'https://social.com/sven',
                                },
                            ],
                        })
                    )
                }

                if (input.toString() === 'https://social.com/sven') {
                    return new Response(
                        JSON.stringify({
                            id: 'sven@remote.com',
                            type: 'Person',
                            preferredUsername: 'sven',
                            name: 'sven ssss',

                            icon: { url: 'icon.jpg' },
                            image: { url: 'image.jpg' },
                        })
                    )
                }

                throw new Error('unexpected request to ' + input)
            }
        })

        test('missing identity', async () => {
            const data = {
                cloudflareAccess: {
                    JWT: {
                        getIdentity() {
                            return null
                        },
                    },
                },
            }

            const context: any = { data }
            const res = await accounts_verify_creds.onRequest(context)
            assert.equal(res.status, 401)
        })

        test('verify the credentials', async () => {
            const connectedUser = {
                display_name: 'sven',
            }

            const context: any = { data: { connectedUser } }
            const res = await accounts_verify_creds.onRequest(context)
            assert.equal(res.status, 200)
            assertCORS(res)
            assertJSON(res)

            const data = await res.json<any>()
            assert.equal(data.display_name, 'sven')
            // Mastodon app expects the id to be a number (as string), it uses
            // it to construct an URL. ActivityPub uses URL as ObjectId so we
            // make sure we don't return the URL.
            assert(!isUrlValid(data.id))
        })

        test('get remote actor by id', async () => {
            const db = await makeDB()
            const res = await accounts_get.handleRequest('sven@remote.com', db)
            assert.equal(res.status, 200)

            const data = await res.json<any>()
            assert.equal(data.username, 'sven')
        })

        test('get unknown local actor by id', async () => {
            const db = await makeDB()
            const res = await accounts_get.handleRequest('sven', db)
            assert.equal(res.status, 404)
        })

        test('get local actor by id', async () => {
            const db = await makeDB()
            const actor: any = { id: await createPerson(db, userKEK, 'sven@cloudflare.com') }
            const actor2: any = { id: await createPerson(db, userKEK, 'sven2@cloudflare.com') }
            const actor3: any = { id: await createPerson(db, userKEK, 'sven3@cloudflare.com') }
            await addFollowing(db, actor, actor2, 'sven2@' + instanceConfig.uri)
            await acceptFollowing(db, actor, actor2)
            await addFollowing(db, actor, actor3, 'sven3@' + instanceConfig.uri)
            await acceptFollowing(db, actor, actor3)
            await addFollowing(db, actor3, actor, 'sven@' + instanceConfig.uri)
            await acceptFollowing(db, actor3, actor)

            await db
                .prepare('INSERT INTO objects (id, type, properties) VALUES (?, ?, ?)')
                .bind('object1', 'Note', JSON.stringify({ content: 'my first status' }))
                .run()
            await db
                .prepare('INSERT INTO outbox_objects (id, actor_id, object_id) VALUES (?, ?, ?)')
                .bind('outbox1', actor.id, 'object1')
                .run()

            const res = await accounts_get.handleRequest('sven', db)
            assert.equal(res.status, 200)

            const data = await res.json<any>()
            assert.equal(data.username, 'sven')
            assert.equal(data.followers_count, 1)
            assert.equal(data.following_count, 2)
            assert.equal(data.statuses_count, 1)
        })

        test('get local actor statuses', async () => {
            const db = await makeDB()
            const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')
            await db
                .prepare('INSERT INTO objects (id, type, properties) VALUES (?, ?, ?)')
                .bind('object1', 'Note', JSON.stringify({ content: 'my first status' }))
                .run()
            await db
                .prepare('INSERT INTO outbox_objects (id, actor_id, object_id) VALUES (?, ?, ?)')
                .bind('outbox1', actorId, 'object1')
                .run()
            await db
                .prepare('INSERT INTO objects (id, type, properties) VALUES (?, ?, ?)')
                .bind('object2', 'Note', JSON.stringify({ content: 'my second status' }))
                .run()
            await db
                .prepare('INSERT INTO outbox_objects (id, actor_id, object_id) VALUES (?, ?, ?)')
                .bind('outbox2', actorId, 'object2')
                .run()

            const req = new Request('https://example.com')
            const res = await accounts_statuses.handleRequest(req, db, 'sven@' + instanceConfig.uri, userKEK)
            assert.equal(res.status, 200)

            const data = await res.json<Array<any>>()
            assert.equal(data.length, 2)
            assert.equal(data[0].content, 'my first status')
            assert.equal(data[0].account.acct, 'sven@' + instanceConfig.uri)
            assert.equal(data[1].content, 'my second status')
        })

        test('get pinned statuses', async () => {
            const db = await makeDB()
            const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')

            const req = new Request('https://example.com?pinned=true')
            const res = await accounts_statuses.handleRequest(req, db, 'sven@' + instanceConfig.uri, userKEK)
            assert.equal(res.status, 200)

            const data = await res.json<Array<any>>()
            assert.equal(data.length, 0)
        })

        test('get local actor statuses with max_id', async () => {
            const db = await makeDB()
            const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')
            await db
                .prepare('INSERT INTO objects (id, type, properties) VALUES (?, ?, ?)')
                .bind('object1', 'Note', JSON.stringify({ content: 'my first status' }))
                .run()
            await db
                .prepare('INSERT INTO objects (id, type, properties) VALUES (?, ?, ?)')
                .bind('object2', 'Note', JSON.stringify({ content: 'my second status' }))
                .run()
            await db
                .prepare('INSERT INTO outbox_objects (id, actor_id, object_id, cdate) VALUES (?, ?, ?, ?)')
                .bind('outbox1', actorId, 'object1', '2022-12-16 08:14:48')
                .run()
            await db
                .prepare('INSERT INTO outbox_objects (id, actor_id, object_id, cdate) VALUES (?, ?, ?, ?)')
                .bind('outbox2', actorId, 'object2', '2022-12-16 10:14:48')
                .run()

            {
                // Query statuses after object1, should only see object2.
                const req = new Request('https://example.com?max_id=object1')
                const res = await accounts_statuses.handleRequest(req, db, 'sven@' + instanceConfig.uri, userKEK)
                assert.equal(res.status, 200)

                const data = await res.json<Array<any>>()
                assert.equal(data.length, 1)
                assert.equal(data[0].content, 'my second status')
                assert.equal(data[0].account.acct, 'sven@' + instanceConfig.uri)
            }

            {
                // Query statuses after object2, nothing is after.
                const req = new Request('https://example.com?max_id=object2')
                const res = await accounts_statuses.handleRequest(req, db, 'sven@' + instanceConfig.uri, userKEK)
                assert.equal(res.status, 200)

                const data = await res.json<Array<any>>()
                assert.equal(data.length, 0)
            }
        })

        test('get remote actor statuses', async () => {
            globalThis.fetch = async (input: RequestInfo) => {
                if (
                    input.toString() === 'https://social.com/.well-known/webfinger?resource=acct%3Asomeone%40social.com'
                ) {
                    return new Response(
                        JSON.stringify({
                            links: [
                                {
                                    rel: 'self',
                                    type: 'application/activity+json',
                                    href: 'https://social.com/someone',
                                },
                            ],
                        })
                    )
                }

                if (input.toString() === 'https://social.com/someone') {
                    return new Response(
                        JSON.stringify({
                            id: 'https://social.com/someone',
                            type: 'Person',
                            preferredUsername: 'someone',
                            outbox: 'https://social.com/outbox',
                        })
                    )
                }

                if (input.toString() === 'https://social.com/outbox') {
                    return new Response(
                        JSON.stringify({
                            first: 'https://social.com/outbox/page1',
                        })
                    )
                }

                if (input.toString() === 'https://social.com/outbox/page1') {
                    return new Response(
                        JSON.stringify({
                            orderedItems: [
                                {
                                    id: 'https://mastodon.social/users/a/statuses/b/activity',
                                    type: 'Create',
                                    actor: 'https://mastodon.social/users/someone',
                                    published: '2022-12-10T23:48:38Z',
                                    object: {
                                        id: 'object1',
                                        type: 'Note',
                                        content: '<p>p</p>',
                                    },
                                },
                            ],
                        })
                    )
                }

                throw new Error('unexpected request to ' + input)
            }

            const db = await makeDB()

            const req = new Request('https://example.com')
            const res = await accounts_statuses.handleRequest(req, db, 'someone@social.com', userKEK)
            assert.equal(res.status, 200)

            const data = await res.json<Array<any>>()
            assert.equal(data.length, 1)
            assert.equal(data[0].content, '<p>p</p>')
            assert.equal(data[0].account.username, 'someone')

            // Statuses were imported locally
            const row = await db.prepare(`SELECT count(*) as count FROM objects`).first()
            assert.equal(row.count, 1)
        })

        test('get remote actor followers', async () => {
            const db = await makeDB()
            const connectedActor: any = { id: 'someid' }
            const res = await accounts_followers.handleRequest(db, 'sven@example.com', connectedActor)
            assert.equal(res.status, 403)
        })

        test('get local actor followers', async () => {
            globalThis.fetch = async (input: any, opts: any) => {
                if (input.toString() === 'https://social.eng.chat/ap/users/sven2') {
                    return new Response(
                        JSON.stringify({
                            id: 'actor',
                            type: 'Person',
                        })
                    )
                }

                throw new Error('unexpected request to ' + input)
            }

            const db = await makeDB()
            const actor: any = {
                id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
            }
            const actor2: any = {
                id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
            }
            await addFollowing(db, actor2, actor, 'sven@' + instanceConfig.uri)
            await acceptFollowing(db, actor2, actor)

            const connectedActor = actor
            const res = await accounts_followers.handleRequest(db, 'sven', connectedActor)
            assert.equal(res.status, 200)

            const data = await res.json<Array<any>>()
            assert.equal(data.length, 1)
        })

        test('get local actor following', async () => {
            globalThis.fetch = async (input: any, opts: any) => {
                if (input.toString() === 'https://social.eng.chat/ap/users/sven2') {
                    return new Response(
                        JSON.stringify({
                            id: 'https://example.com/foo',
                            type: 'Person',
                        })
                    )
                }

                throw new Error('unexpected request to ' + input)
            }

            const db = await makeDB()
            const actor: any = {
                id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
            }
            const actor2: any = {
                id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
            }
            await addFollowing(db, actor, actor2, 'sven@' + instanceConfig.uri)
            await acceptFollowing(db, actor, actor2)

            const connectedActor = actor
            const res = await accounts_following.handleRequest(db, 'sven', connectedActor)
            assert.equal(res.status, 200)

            const data = await res.json<Array<any>>()
            assert.equal(data.length, 1)
        })

        test('get remote actor following', async () => {
            const db = await makeDB()

            const connectedActor: any = { id: 'someid' }
            const res = await accounts_following.handleRequest(db, 'sven@example.com', connectedActor)
            assert.equal(res.status, 403)
        })

        test('get remote actor featured_tags', async () => {
            const res = await accounts_featured_tags.onRequest()
            assert.equal(res.status, 200)
        })

        test('get remote actor lists', async () => {
            const res = await accounts_lists.onRequest()
            assert.equal(res.status, 200)
        })

        describe('relationships', () => {
            test('relationships missing ids', async () => {
                const db = await makeDB()
                const connectedActor: any = { id: 'someid' }
                const req = new Request('https://mastodon.example/api/v1/accounts/relationships')
                const res = await accounts_relationships.handleRequest(req, db, connectedActor)
                assert.equal(res.status, 400)
            })

            test('relationships with ids', async () => {
                const db = await makeDB()
                const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=first&id[]=second')
                const connectedActor: any = { id: 'someid' }
                const res = await accounts_relationships.handleRequest(req, db, connectedActor)
                assert.equal(res.status, 200)
                assertCORS(res)
                assertJSON(res)

                const data = await res.json<Array<any>>()
                assert.equal(data.length, 2)
                assert.equal(data[0].id, 'first')
                assert.equal(data[0].following, false)
                assert.equal(data[1].id, 'second')
                assert.equal(data[1].following, false)
            })

            test('relationships with one id', async () => {
                const db = await makeDB()
                const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=first')
                const connectedActor: any = { id: 'someid' }
                const res = await accounts_relationships.handleRequest(req, db, connectedActor)
                assert.equal(res.status, 200)
                assertCORS(res)
                assertJSON(res)

                const data = await res.json<Array<any>>()
                assert.equal(data.length, 1)
                assert.equal(data[0].id, 'first')
                assert.equal(data[0].following, false)
            })

            test('relationships following', async () => {
                const db = await makeDB()
                const actor: any = {
                    id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
                }
                const actor2: any = {
                    id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
                }
                await addFollowing(db, actor, actor2, 'sven2@' + instanceConfig.uri)
                await acceptFollowing(db, actor, actor2)

                const req = new Request(
                    'https://mastodon.example/api/v1/accounts/relationships?id[]=sven2@' + instanceConfig.uri
                )
                const res = await accounts_relationships.handleRequest(req, db, actor)
                assert.equal(res.status, 200)

                const data = await res.json<Array<any>>()
                assert.equal(data.length, 1)
                assert.equal(data[0].following, true)
            })
        })

        test('follow local account', async () => {
            const db = await makeDB()

            const connectedActor: any = {
                id: 'connectedActor',
            }

            const req = new Request('https://example.com', { method: 'POST' })
            const res = await accounts_follow.handleRequest(req, db, 'localuser', connectedActor, userKEK)
            assert.equal(res.status, 403)
        })

        describe('follow', () => {
            let receivedActivity: any = null

            beforeEach(() => {
                receivedActivity = null

                globalThis.fetch = async (input: any, opts: any) => {
                    if (
                        input.toString() ===
                        'https://social.eng.chat/.well-known/webfinger?resource=acct%3Aactor%40social.eng.chat'
                    ) {
                        return new Response(
                            JSON.stringify({
                                links: [
                                    {
                                        rel: 'self',
                                        type: 'application/activity+json',
                                        href: 'https://social.com/sven',
                                    },
                                ],
                            })
                        )
                    }

                    if (input.toString() === 'https://social.com/sven') {
                        return new Response(
                            JSON.stringify({
                                id: `https://${instanceConfig.uri}/ap/users/actor`,
                                type: 'Person',
                                inbox: 'https://example.com/inbox',
                            })
                        )
                    }

                    if (input.url === 'https://example.com/inbox') {
                        assert.equal(input.method, 'POST')
                        receivedActivity = await input.json()
                        return new Response('')
                    }

                    throw new Error('unexpected request to ' + input)
                }
            })

            test('follow account', async () => {
                const db = await makeDB()
                const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')

                const connectedActor: any = {
                    id: actorId,
                }

                const req = new Request('https://example.com', { method: 'POST' })
                const res = await accounts_follow.handleRequest(
                    req,
                    db,
                    'actor@' + instanceConfig.uri,
                    connectedActor,
                    userKEK
                )
                assert.equal(res.status, 200)
                assertCORS(res)
                assertJSON(res)

                assert(receivedActivity)
                assert.equal(receivedActivity.type, 'Follow')

                const row = await db
                    .prepare(`SELECT target_actor_acct, target_actor_id, state FROM actor_following WHERE actor_id=?`)
                    .bind(actorId)
                    .first()
                assert(row)
                assert.equal(row.target_actor_acct, 'actor@' + instanceConfig.uri)
                assert.equal(row.target_actor_id, `https://${instanceConfig.uri}/ap/users/actor`)
                assert.equal(row.state, 'pending')
            })

            test('unfollow account', async () => {
                const db = await makeDB()
                const actor: any = {
                    id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
                }
                const follower: any = {
                    id: await createPerson(db, userKEK, 'actor@cloudflare.com'),
                }
                await addFollowing(db, actor, follower, 'not needed')

                const connectedActor: any = actor

                const req = new Request('https://example.com', { method: 'POST' })
                const res = await accounts_unfollow.handleRequest(
                    req,
                    db,
                    'actor@' + instanceConfig.uri,
                    connectedActor,
                    userKEK
                )
                assert.equal(res.status, 200)
                assertCORS(res)
                assertJSON(res)

                assert(receivedActivity)
                assert.equal(receivedActivity.type, 'Undo')
                assert.equal(receivedActivity.object.type, 'Follow')

                const row = await db
                    .prepare(`SELECT count(*) as count FROM actor_following WHERE actor_id=?`)
                    .bind(actor.id)
                    .first()
                assert(row)
                assert.equal(row.count, 0)
            })
        })
    })
})
