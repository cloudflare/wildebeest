import { strict as assert } from 'node:assert/strict'
import { getMentions } from '../../mastodon/status'
import * as statuses from '../../functions/api/v1/statuses'
import { createPerson } from 'wildebeest/activitypub/actors'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from '../utils'

const userKEK = 'test_kek4'

describe('Mastodon APIs', () => {
    describe('statuses', () => {
        test('create new status missing params', async () => {
            const db = await makeDB()

            const body = { status: 'my status' }
            const req = new Request('https://example.com', {
                method: 'POST',
                body: JSON.stringify(body),
            })

            const connectedActor: any = {}
            const connectedUser: any = {}
            const res = await statuses.handleRequest(req, db, connectedActor, connectedUser, userKEK)
            assert.equal(res.status, 400)
        })

        test('create new status creates Note', async () => {
            const db = await makeDB()
            const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')

            const body = {
                status: 'my status',
                visibility: 'public',
            }
            const req = new Request('https://example.com', {
                method: 'POST',
                body: JSON.stringify(body),
            })

            const connectedActor: any = { id: actorId }
            const connectedUser: any = {}
            const res = await statuses.handleRequest(req, db, connectedActor, connectedUser, userKEK)
            assert.equal(res.status, 200)
            assertJSON(res)

            const data = await res.json<any>()
            // Required fields from https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Status.java
            assert(data.id !== undefined)
            assert(data.uri !== undefined)
            assert(data.created_at !== undefined)
            assert(data.account !== undefined)
            assert(data.visibility !== undefined)
            assert(data.spoiler_text !== undefined)
            assert(data.media_attachments !== undefined)
            assert(data.mentions !== undefined)
            assert(data.tags !== undefined)
            assert(data.emojis !== undefined)

            const row = await db
                .prepare(
                    `
          SELECT
              json_extract(properties, '$.content') as content
          FROM objects WHERE id = ?
        `
                )
                .bind(data.id)
                .first()
            assert.equal(row.content, 'my status')
        })

        test("create new status adds to Actor's outbox", async () => {
            const db = await makeDB()
            const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')

            const body = {
                status: 'my status',
                visibility: 'public',
            }
            const req = new Request('https://example.com', {
                method: 'POST',
                body: JSON.stringify(body),
            })

            const connectedActor: any = { id: actorId }
            const connectedUser: any = {}
            const res = await statuses.handleRequest(req, db, connectedActor, connectedUser, userKEK)
            assert.equal(res.status, 200)

            const data = await res.json<any>()
            const row = await db
                .prepare(
                    `
          SELECT
              count(*) as count
          FROM outbox_objects WHERE object_id = ?
        `
                )
                .bind(data.id)
                .first()
            assert.equal(row.count, 1)
        })

        test('create new status with mention delivers ActivityPub Note', async () => {
            let deliveredNote: any = null

            globalThis.fetch = async (input: RequestInfo, data: any) => {
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
                            inbox: 'https://social.com/sven/inbox',
                        })
                    )
                }

                if (input === 'https://social.com/sven/inbox') {
                    assert.equal(data.method, 'POST')
                    const body = JSON.parse(data.body)
                    deliveredNote = body
                    return new Response()
                }

                // @ts-ignore: shut up
                if (Object.keys(input).includes('url') && input.url === 'https://social.com/sven/inbox') {
                    const request = input as Request
                    assert.equal(request.method, 'POST')
                    const bodyB = await streamToArrayBuffer(request.body as ReadableStream)
                    const dec = new TextDecoder()
                    const body = JSON.parse(dec.decode(bodyB))
                    deliveredNote = body
                    return new Response()
                }

                throw new Error('unexpected request to ' + input)
            }

            const db = await makeDB()
            const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')

            const body = {
                status: '@sven@remote.com my status',
                visibility: 'public',
            }
            const req = new Request('https://example.com', {
                method: 'POST',
                body: JSON.stringify(body),
            })

            const connectedActor: any = { id: actorId, type: 'Person' }
            const connectedUser: any = {}
            const res = await statuses.handleRequest(req, db, connectedActor, connectedUser, userKEK)
            assert.equal(res.status, 200)

            assert(deliveredNote)
            assert.equal(deliveredNote.type, 'Create')
            assert.equal(deliveredNote.actor.type, 'Person')
            assert.equal(deliveredNote.object.type, 'Note')
        })

        test('get mentions from status', () => {
            {
                const mentions = getMentions('test status')
                assert.equal(mentions.length, 0)
            }

            {
                const mentions = getMentions('@sven@instance.horse test status')
                assert.equal(mentions.length, 1)
                assert.equal(mentions[0].localPart, 'sven')
                assert.equal(mentions[0].domain, 'instance.horse')
            }

            {
                const mentions = getMentions('@sven test status')
                assert.equal(mentions.length, 1)
                assert.equal(mentions[0].localPart, 'sven')
                assert.equal(mentions[0].domain, null)
            }
        })
    })
})
