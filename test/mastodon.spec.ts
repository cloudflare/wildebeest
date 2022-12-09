import { strict as assert } from 'node:assert/strict'
import * as instance from '../functions/api/v1/instance'
import * as apps from '../functions/api/v1/apps'
import * as oauth_authorize from '../functions/oauth/authorize'
import * as oauth_token from '../functions/oauth/token'
import * as search from '../functions/api/v2/search'
import * as custom_emojis from '../functions/api/v1/custom_emojis'
import * as accounts_verify_creds from '../functions/api/v1/accounts/verify_credentials'
import * as accounts_get from '../functions/api/v1/accounts/[id]'
import * as accounts_statuses from '../functions/api/v1/accounts/[id]/statuses'
import * as accounts_followers from '../functions/api/v1/accounts/[id]/followers'
import * as accounts_following from '../functions/api/v1/accounts/[id]/following'
import * as accounts_featured_tags from '../functions/api/v1/accounts/[id]/featured_tags'
import * as accounts_lists from '../functions/api/v1/accounts/[id]/lists'
import * as accounts_relationships from '../functions/api/v1/accounts/relationships'
import * as timelines_home from '../functions/api/v1/timelines/home'
import * as timelines_public from '../functions/api/v1/timelines/public'
import * as notifications from '../functions/api/v1/notifications'
import { TEST_JWT, ACCESS_CERTS } from './test-data'
import { defaultImages } from '../config/accounts'
import { makeDB, assertCORS, assertJSON, assertCache } from './utils'
import { accessConfig } from '../config/access'
import * as middleware from '../functions/_middleware'
import * as statuses from '../functions/api/v1/statuses'

describe('Mastodon APIs', () => {
    describe('instance', () => {
        test('return the instance infos', async () => {
            const res = await instance.onRequest()
            assert.equal(res.status, 200)
            assertCORS(res)
            assertJSON(res)
            assertCache(res, 180)
        })
    })

    describe('apps', () => {
        test('return the app infos', async () => {
            const res = await apps.onRequest()
            assert.equal(res.status, 200)
            assertCORS(res)
            assertJSON(res)
        })
    })

    describe('middleware', () => {
        test('CORS on OPTIONS', async () => {
            const request = new Request('https://example.com', { method: 'OPTIONS' })
            const ctx: any = {
                request,
            }

            const res = await middleware.main(ctx)
            assert.equal(res.status, 200)
            assertCORS(res)
        })

        test('test no identity', async () => {
            globalThis.fetch = async (input: RequestInfo) => {
                if (input === accessConfig.domain + '/cdn-cgi/access/certs') {
                    return new Response(JSON.stringify(ACCESS_CERTS))
                }

                if (input === accessConfig.domain + '/cdn-cgi/access/get-identity') {
                    return new Response('', { status: 404 })
                }

                throw new Error('unexpected request to ' + input)
            }

            const headers = { authorization: 'Bearer ' + TEST_JWT }
            const request = new Request('https://example.com', { headers })
            const ctx: any = {
                request,
            }

            const res = await middleware.main(ctx)
            assert.equal(res.status, 401)
        })

        test('test user not found', async () => {
            globalThis.fetch = async (input: RequestInfo) => {
                if (input === accessConfig.domain + '/cdn-cgi/access/certs') {
                    return new Response(JSON.stringify(ACCESS_CERTS))
                }

                if (input === accessConfig.domain + '/cdn-cgi/access/get-identity') {
                    return new Response(
                        JSON.stringify({
                            email: 'some@cloudflare.com',
                        })
                    )
                }

                throw new Error('unexpected request to ' + input)
            }

            const db = await makeDB()

            const headers = { authorization: 'Bearer ' + TEST_JWT }
            const request = new Request('https://example.com', { headers })
            const ctx: any = {
                env: { DATABASE: db },
                request,
            }

            const res = await middleware.main(ctx)
            assert.equal(res.status, 401)
        })

        test('success passes data and calls next', async () => {
            globalThis.fetch = async (input: RequestInfo) => {
                if (input === accessConfig.domain + '/cdn-cgi/access/certs') {
                    return new Response(JSON.stringify(ACCESS_CERTS))
                }

                if (input === accessConfig.domain + '/cdn-cgi/access/get-identity') {
                    return new Response(
                        JSON.stringify({
                            email: 'sven@cloudflare.com',
                        })
                    )
                }

                throw new Error('unexpected request to ' + input)
            }

            const db = await makeDB()
            await db
                .prepare('INSERT INTO actors (id, email, type, properties) VALUES (?, ?, ?, ?)')
                .bind('sven', 'sven@cloudflare.com', 'Person', JSON.stringify({}))
                .run()

            const data: any = {}

            const headers = { authorization: 'Bearer ' + TEST_JWT }
            const request = new Request('https://example.com', { headers })
            const ctx: any = {
                next: () => new Response(),
                data,
                env: { DATABASE: db },
                request,
            }

            const res = await middleware.main(ctx)
            assert.equal(res.status, 200)
            assert.equal(data.connectedUser.id, 'sven')
            assert.equal(data.connectedUser.acct, 'sven_cloudflare_com')
        })
    })

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
        })

        test('get remote actor by id', async () => {
            const res = await accounts_get.handleRequest('sven@remote.com')
            assert.equal(res.status, 200)
        })

        test('get remote actor statuses', async () => {
            const res = await accounts_statuses.onRequest()
            assert.equal(res.status, 200)
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

    describe('oauth', () => {
        beforeEach(() => {
            globalThis.fetch = async (input: RequestInfo) => {
                if (input === accessConfig.domain + '/cdn-cgi/access/certs') {
                    return new Response(JSON.stringify(ACCESS_CERTS))
                }

                if (input === accessConfig.domain + '/cdn-cgi/access/get-identity') {
                    return new Response(
                        JSON.stringify({
                            email: 'some@cloudflare.com',
                        })
                    )
                }

                throw new Error('unexpected request to ' + input)
            }
        })

        test('authorize missing params', async () => {
            const db = await makeDB()
            const user_kek = 'test_kek'

            let req = new Request('https://example.com/oauth/authorize')
            let res = await oauth_authorize.handleRequest(req, db, user_kek)
            assert.equal(res.status, 400)

            req = new Request('https://example.com/oauth/authorize?scope=foobar')
            res = await oauth_authorize.handleRequest(req, db, user_kek)
            assert.equal(res.status, 400)
        })

        test('authorize unsupported response_type', async () => {
            const db = await makeDB()
            const user_kek = 'test_kek'

            const params = new URLSearchParams({
                redirect_uri: 'https://example.com',
                response_type: 'hein',
                client_id: 'client_id',
            })

            const req = new Request('https://example.com/oauth/authorize?' + params)
            const res = await oauth_authorize.handleRequest(req, db, user_kek)
            assert.equal(res.status, 400)
        })

        test('authorize redirects with code on success and creates user', async () => {
            const db = await makeDB()
            const user_kek = 'test_kek'

            const params = new URLSearchParams({
                redirect_uri: 'https://example.com',
                response_type: 'code',
                client_id: 'client_id',
            })

            const headers = {
                'Cf-Access-Jwt-Assertion': TEST_JWT,
            }

            const req = new Request('https://example.com/oauth/authorize?' + params, {
                headers,
            })
            const res = await oauth_authorize.handleRequest(req, db, user_kek)
            assert.equal(res.status, 302)

            const location = res.headers.get('location')
            assert.equal(location, 'https://example.com/?code=' + TEST_JWT)

            const actor = await db.prepare('SELECT * FROM actors').first()
            assert.equal(actor.email, 'some@cloudflare.com')
        })

        test('authorize with redirect_uri urn:ietf:wg:oauth:2.0:oob', async () => {
            const db = await makeDB()
            const user_kek = 'test_kek'

            const params = new URLSearchParams({
                redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
                response_type: 'code',
                client_id: 'client_id',
            })

            const headers = {
                'Cf-Access-Jwt-Assertion': TEST_JWT,
            }

            const req = new Request('https://example.com/oauth/authorize?' + params, {
                headers,
            })
            const res = await oauth_authorize.handleRequest(req, db, user_kek)
            assert.equal(res.status, 200)

            assert.equal(await res.text(), TEST_JWT)
        })

        test('token returns auth infos', async () => {
            const body = {
                code: 'some-code',
            }

            const req = new Request('https://example.com/oauth/token', {
                method: 'POST',
                body: JSON.stringify(body),
            })
            const res = await oauth_token.handleRequest(req)
            assert.equal(res.status, 200)
            assertCORS(res)
            assertJSON(res)

            const data = await res.json<any>()
            assert.equal(data.access_token, 'some-code')
            assert.equal(data.scope, 'read write follow push')
        })

        test('token handles empty code', async () => {
            const body = {
                code: '',
            }

            const req = new Request('https://example.com/oauth/token', {
                method: 'POST',
                body: JSON.stringify(body),
            })
            const res = await oauth_token.handleRequest(req)
            assert.equal(res.status, 401)
        })
    })

    describe('search', () => {
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

                if (
                    input.toString() ===
                    'https://remote.com/.well-known/webfinger?resource=acct%3Adefault-avatar-and-header%40remote.com'
                ) {
                    return new Response(
                        JSON.stringify({
                            links: [
                                {
                                    rel: 'self',
                                    type: 'application/activity+json',
                                    href: 'https://social.com/default-avatar-and-header',
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

                if (input === 'https://social.com/default-avatar-and-header') {
                    return new Response(
                        JSON.stringify({
                            id: '1234',
                            type: 'Person',
                            preferredUsername: 'sven',
                            name: 'sven ssss',
                        })
                    )
                }

                throw new Error(`unexpected request to "${input}"`)
            }
        })

        test('no query returns an error', async () => {
            const req = new Request('https://example.com/api/v2/search')
            const res = await search.handleRequest(req)
            assert.equal(res.status, 400)
        })

        test('empty results', async () => {
            const req = new Request('https://example.com/api/v2/search?q=non-existing-local-user')
            const res = await search.handleRequest(req)
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)

            const data = await res.json<any>()
            assert.equal(data.accounts.length, 0)
            assert.equal(data.statuses.length, 0)
            assert.equal(data.hashtags.length, 0)
        })

        test('queries WebFinger when remote account', async () => {
            const req = new Request('https://example.com/api/v2/search?q=@sven@remote.com&resolve=true')
            const res = await search.handleRequest(req)
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)

            const data = await res.json<any>()
            assert.equal(data.accounts.length, 1)
            assert.equal(data.statuses.length, 0)
            assert.equal(data.hashtags.length, 0)

            const account = data.accounts[0]
            assert.equal(account.id, 'sven@remote.com')
            assert.equal(account.username, 'sven')
            assert.equal(account.acct, 'sven@remote.com')
        })

        test('queries WebFinger when remote account with default avatar / header', async () => {
            const req = new Request(
                'https://example.com/api/v2/search?q=@default-avatar-and-header@remote.com&resolve=true'
            )
            const res = await search.handleRequest(req)
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)

            const data = await res.json<any>()
            assert.equal(data.accounts.length, 1)
            assert.equal(data.statuses.length, 0)
            assert.equal(data.hashtags.length, 0)

            const account = data.accounts[0]
            assert.equal(account.avatar, defaultImages.avatar)
            assert.equal(account.header, defaultImages.header)
        })

        test("don't queries WebFinger when resolve is set to false", async () => {
            globalThis.fetch = () => {
                throw new Error('unreachable')
            }

            const req = new Request('https://example.com/api/v2/search?q=@sven@remote.com&resolve=false')
            const res = await search.handleRequest(req)
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)
        })
    })

    describe('custom emojis', () => {
        test('returns an empty array', async () => {
            const res = await custom_emojis.onRequest()
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)
            assertCache(res, 300)

            const data = await res.json<any>()
            assert.equal(data.length, 0)
        })
    })

    describe('timelines', () => {
        test('home returns an empty array', async () => {
            const res = await timelines_home.onRequest()
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)

            const data = await res.json<any>()
            assert.equal(data.length, 0)
        })

        test('public returns an empty array', async () => {
            const res = await timelines_home.onRequest()
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)

            const data = await res.json<any>()
            assert.equal(data.length, 0)
        })
    })

    describe('notifications', () => {
        test('returns an empty array', async () => {
            const res = await notifications.onRequest()
            assert.equal(res.status, 200)
            assertJSON(res)
            assertCORS(res)

            const data = await res.json<any>()
            assert.equal(data.length, 0)
        })
    })

    describe('statuses', () => {
        test('create new status missing params', async () => {
            const db = await makeDB()

            const body = { status: 'my status' }
            const req = new Request('https://example.com', {
                method: 'POST',
                body: JSON.stringify(body),
            })

            const connectedUser: any = {}
            const res = await statuses.handleRequest(req, db, connectedUser)
            assert.equal(res.status, 400)
        })

        test('create new status creates Note', async () => {
            const db = await makeDB()

            const body = {
                status: 'my status',
                visibility: 'public',
                sensitive: false,
            }
            const req = new Request('https://example.com', {
                method: 'POST',
                body: JSON.stringify(body),
            })

            const connectedUser: any = {}
            const res = await statuses.handleRequest(req, db, connectedUser)
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
    })
})
