import { strict as assert } from 'node:assert/strict'
import { instanceConfig } from 'wildebeest/config/instance'
import * as v1_instance from 'wildebeest/functions/api/v1/instance'
import * as v2_instance from 'wildebeest/functions/api/v2/instance'
import * as apps from 'wildebeest/functions/api/v1/apps'
import * as search from 'wildebeest/functions/api/v2/search'
import * as custom_emojis from 'wildebeest/functions/api/v1/custom_emojis'
import * as notifications from 'wildebeest/functions/api/v1/notifications'
import { TEST_JWT, ACCESS_CERTS } from './test-data'
import { defaultImages } from 'wildebeest/config/accounts'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from './utils'
import { accessConfig } from 'wildebeest/config/access'
import * as middleware from 'wildebeest/backend/src/utils/auth'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { Actor, createPerson, getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { insertNotification, insertFollowNotification } from 'wildebeest/backend/src/mastodon/notification'
import { createClient, getClientById } from '../src/mastodon/client'
import { createSubscription } from '../src/mastodon/subscription'

const userKEK = 'test_kek'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Mastodon APIs', () => {
	describe('instance', () => {
		test('return the instance infos v1', async () => {
			const res = await v1_instance.onRequest()
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)
			assertCache(res, 180)
		})

		test('return the instance infos v2', async () => {
			const res = await v2_instance.onRequest()
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)
			assertCache(res, 180)
		})

		test('adds a short_description if missing', async () => {
			assert(!instanceConfig.short_description)

			const res = await v1_instance.onRequest()
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(typeof data.short_description, 'string')
		})
	})

	describe('apps', () => {
		test('return the app infos', async () => {
			const request = new Request('https://example.com', {
				method: 'POST',
				body: '{"redirect_uris":"mastodon://joinmastodon.org/oauth","website":"https://app.joinmastodon.org/ios","client_name":"Mastodon for iOS","scopes":"read write follow push"}',
			})
			const ctx: any = {
				next: () => new Response(),
				data: null,
				env: {},
				request,
			}

			const res = await apps.onRequest(ctx)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			const { name, website, redirect_uri, client_id, client_secret, vapid_key, ...rest } = await res.json<
				Record<string, string>
			>()

			assert.equal(name, 'Mastodon for iOS')
			assert.equal(website, 'https://app.joinmastodon.org/ios')
			assert.equal(redirect_uri, 'mastodon://joinmastodon.org/oauth')
			assert.equal(client_id, 'TWhM-tNSuncnqN7DBJmoyeLnk6K3iJJ71KKXxgL1hPM')
			assert.equal(client_secret, 'ZEaFUFmF0umgBX1qKJDjaU99Q31lDkOU8NutzTOoliw')
			assert.equal(
				vapid_key,
				'BCk-QqERU0q-CfYZjcuB6lnyyOYfJ2AifKqfeGIm7Z-HiTU5T9eTG5GxVA0_OH5mMlI4UkkDTpaZwozy0TzdZ2M='
			)
			assert.deepEqual(rest, {})
		})

		test('returns 404 for GET request', async () => {
			const request = new Request('https://example.com')
			const ctx: any = {
				next: () => new Response(),
				data: null,
				env: {},
				request,
			}

			const res = await apps.onRequest(ctx)
			assert.equal(res.status, 400)
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
				data: {},
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
							email: 'username@cloudflare.com',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			await createPerson(db, userKEK, 'username@cloudflare.com')

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
			assert.equal(data.connectedUser.id, 'username')
			assert(isUrlValid(data.connectedActor.id))
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

				if (input.toString() === 'https://social.com/sven') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/sven',
							type: 'Person',
							preferredUsername: 'sven',
							name: 'sven ssss',

							icon: { url: 'icon.jpg' },
							image: { url: 'image.jpg' },
						})
					)
				}

				if (input.toString() === 'https://social.com/default-avatar-and-header') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/default-avatar-and-header',
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
			const req = new Request('https://example.com/api/v2/search?q=@default-avatar-and-header@remote.com&resolve=true')
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

	describe('notifications', () => {
		test('returns notifications stored in db', async () => {
			const db = await makeDB()
			const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')
			const fromActorId = await createPerson(db, userKEK, 'from@cloudflare.com')
			await db
				.prepare("INSERT INTO objects (id, type, properties, local, mastodon_id) VALUES (?, ?, ?, 1, 'mastodon_id')")
				.bind('object1', 'Note', JSON.stringify({ content: 'my status' }))
				.run()

			const connectedActor: any = {
				id: actorId,
			}
			const fromActor: any = {
				id: fromActorId,
			}
			const obj: any = {
				id: 'object1',
			}
			await insertFollowNotification(db, connectedActor, fromActor)
			await sleep(10)
			await insertNotification(db, 'favourite', connectedActor, fromActor, obj)
			await sleep(10)
			await insertNotification(db, 'mention', connectedActor, fromActor, obj)

			const res = await notifications.handleRequest(db, connectedActor)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 3)

			assert.equal(data[0].type, 'mention')
			assert.equal(data[0].account.username, 'from')
			assert.equal(data[0].status.id, 'mastodon_id')

			assert.equal(data[1].type, 'favourite')
			assert.equal(data[1].account.username, 'from')
			assert.equal(data[1].status.id, 'mastodon_id')

			assert.equal(data[2].type, 'follow')
			assert.equal(data[2].account.username, 'from')
			assert.equal(data[2].status, undefined)
		})
	})

	describe('subscriptions', () => {
		test('basic creation', async () => {
			const db = await makeDB()
			const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')
			const actor = (await getPersonById(db, actorId)) as Actor
			const client = await createClient(
				db,
				'client_name',
				'https://redirect.com/',
				'https://website.com',
				'list create'
			)

			const fetchedClient = await getClientById(db, client.id)
			assert(fetchedClient)
			assert.equal(client.secret, fetchedClient.secret)

			await createSubscription(db, actor, client, {
				endpoint: 'https://endpoint',
				key_p256dh: 'base64key',
				key_auth: 'base64auth',
				alert_mention: true,
				alert_status: true,
				alert_reblog: true,
				alert_follow: true,
				alert_follow_request: true,
				alert_favourite: true,
				alert_poll: true,
				alert_update: true,
				alert_admin_sign_up: true,
				alert_admin_report: true,
				policy: 'all',
			})
		})
	})
})
