import { strict as assert } from 'node:assert/strict'
import { instanceConfig } from 'wildebeest/config/instance'
import * as v1_instance from '../functions/api/v1/instance'
import * as v2_instance from '../functions/api/v2/instance'
import * as apps from '../functions/api/v1/apps'
import * as search from '../functions/api/v2/search'
import * as custom_emojis from '../functions/api/v1/custom_emojis'
import * as timelines_home from '../functions/api/v1/timelines/home'
import * as timelines_public from '../functions/api/v1/timelines/public'
import * as notifications from '../functions/api/v1/notifications'
import { TEST_JWT, ACCESS_CERTS } from './test-data'
import { defaultImages } from '../config/accounts'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from './utils'
import { accessConfig } from '../config/access'
import * as middleware from '../utils/auth'
import { loadLocalMastodonAccount } from '../mastodon/account'
import { getSigningKey } from '../mastodon/account'
import { createPerson } from 'wildebeest/activitypub/actors'
import { insertNotification } from 'wildebeest/mastodon/notification'

const userKEK = 'test_kek'

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
			assert.equal(data.connectedUser.id, 'username@' + instanceConfig.uri)
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
							id: 'sven@remote.com',
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
		test('returns notifications stored in db', async () => {
			const db = await makeDB()
			const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')
			const fromActorId = await createPerson(db, userKEK, 'from@cloudflare.com')
			await db
				.prepare('INSERT INTO objects (id, type, properties) VALUES (?, ?, ?)')
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
			await insertNotification(db, 'mention', connectedActor, fromActor, obj)

			const res = await notifications.handleRequest(db, connectedActor)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 1)
			assert.equal(data[0].type, 'mention')
			assert.equal(data[0].account.username, 'from')
			assert.equal(data[0].status.id, 'object1')
		})
	})

	describe('loadLocalMastodonAccount', () => {
		test('ensure correct statuses_count', async () => {
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

			const acct = 'doesntmatter@instance.com'
			const actor: any = {
				id: actorId,
			}
			const account = await loadLocalMastodonAccount(db, acct, actor)

			assert.equal(account.statuses_count, 1)
		})
	})
})
