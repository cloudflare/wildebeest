import { strict as assert } from 'node:assert/strict'
import * as accounts_following from '../../functions/api/v1/accounts/[id]/following'
import * as accounts_featured_tags from '../../functions/api/v1/accounts/[id]/featured_tags'
import * as accounts_lists from '../../functions/api/v1/accounts/[id]/lists'
import * as accounts_relationships from '../../functions/api/v1/accounts/relationships'
import * as accounts_followers from '../../functions/api/v1/accounts/[id]/followers'
import { instanceConfig } from 'wildebeest/config/instance'
import * as accounts_statuses from '../../functions/api/v1/accounts/[id]/statuses'
import * as accounts_get from '../../functions/api/v1/accounts/[id]'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from '../utils'
import * as accounts_verify_creds from '../../functions/api/v1/accounts/verify_credentials'
import { createPerson } from 'wildebeest/activitypub/actors'

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

                if (input === 'https://social.com/sven') {
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
            const res = await accounts_get.handleRequest('sven@remote.com')
            assert.equal(res.status, 200)
        })

        test('get local actor statuses', async () => {
            const db = await makeDB()
            const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')
            await db
                .prepare('INSERT INTO objects (id, type, properties) VALUES (?, ?, ?)')
                .bind('object1', 'Note', JSON.stringify({ content: 'my status' }))
                .run()
            await db
                .prepare('INSERT INTO outbox_objects (id, actor_id, object_id) VALUES (?, ?, ?)')
                .bind('outbox1', actorId, 'object1')
                .run()

            const res = await accounts_statuses.handleRequest(db, 'sven@' + instanceConfig.uri)
            assert.equal(res.status, 200)

            const data = await res.json<Array<any>>()
            assert.equal(data.length, 1)
            assert.equal(data[0].content, 'my status')
            assert.equal(data[0].account.acct, 'sven@' + instanceConfig.uri)
        })

        test('get remote actor statuses', async () => {
            const db = await makeDB()

            const res = await accounts_statuses.handleRequest(db, 'someone@somesocial.com')
            assert.equal(res.status, 400)
        })

        test('get remote actor followers', async () => {
            const res = await accounts_followers.onRequest()
            assert.equal(res.status, 200)
        })

        test('get remote actor following', async () => {
            const res = await accounts_following.onRequest()
            assert.equal(res.status, 200)
        })

        test('get remote actor featured_tags', async () => {
            const res = await accounts_featured_tags.onRequest()
            assert.equal(res.status, 200)
        })

        test('get remote actor lists', async () => {
            const res = await accounts_lists.onRequest()
            assert.equal(res.status, 200)
        })

        test('get local actor by id', async () => {
            const res = await accounts_get.handleRequest('sven')
            assert.equal(res.status, 404)
        })

        test('relationships missing ids', async () => {
            const req = new Request('https://mastodon.example/api/v1/accounts/relationships')
            const res = await accounts_relationships.handleRequest(req)
            assert.equal(res.status, 400)
        })

        test('relationships with ids', async () => {
            const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=first&id[]=second')
            const res = await accounts_relationships.handleRequest(req)
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
            const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=first')
            const res = await accounts_relationships.handleRequest(req)
            assert.equal(res.status, 200)
            assertCORS(res)
            assertJSON(res)

            const data = await res.json<Array<any>>()
            assert.equal(data.length, 1)
            assert.equal(data[0].id, 'first')
            assert.equal(data[0].following, false)
        })
    })
})
