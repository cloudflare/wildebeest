import { strict as assert } from 'node:assert/strict'
import * as v1_instance from 'wildebeest/functions/api/v1/instance'
import * as v2_instance from 'wildebeest/functions/api/v2/instance'
import * as apps from 'wildebeest/functions/api/v1/apps'
import * as custom_emojis from 'wildebeest/functions/api/v1/custom_emojis'
import * as notifications from 'wildebeest/functions/api/v1/notifications'
import { defaultImages } from 'wildebeest/config/accounts'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer, createTestClient } from './utils'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { Actor, createPerson, getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { insertNotification, insertFollowNotification } from 'wildebeest/backend/src/mastodon/notification'
import { createClient, getClientById } from '../src/mastodon/client'
import { createSubscription } from '../src/mastodon/subscription'
import * as startInstance from 'wildebeest/functions/start-instance'
import * as subscription from 'wildebeest/functions/api/v1/push/subscription'
import { configure } from 'wildebeest/backend/src/config'

const userKEK = 'test_kek'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const domain = 'cloudflare.com'

describe('Mastodon APIs', () => {
	describe('instance', () => {
		test('return the instance infos v1', async () => {
			const db = await makeDB()
			const data = {
				title: 'title',
				uri: 'uri',
				email: 'email',
				description: 'description',
				accessAud: '1',
				accessDomain: 'foo',
			}
			await configure(db, data)

			const res = await v1_instance.handleRequest(domain, db)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)
			assertCache(res, 180)

			{
				const data = await res.json<any>()
				assert.equal(data.rules.length, 0)
				assert.equal(data.uri, domain)
			}
		})

		test('return the instance infos v2', async () => {
			const db = await makeDB()
			const data = {
				title: 'title',
				uri: 'uri',
				email: 'email',
				description: 'description',
				accessAud: '1',
				accessDomain: 'foo',
			}
			await configure(db, data)

			const res = await v2_instance.handleRequest(domain, db)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)
			assertCache(res, 180)
		})

		test('adds a short_description if missing', async () => {
			const db = await makeDB()
			const data = {
				title: 'title',
				uri: 'uri',
				email: 'email',
				description: 'description',
				accessAud: '1',
				accessDomain: 'foo',
			}
			await configure(db, data)

			const res = await v1_instance.handleRequest(domain, db)
			assert.equal(res.status, 200)

			{
				const data = await res.json<any>()
				assert.equal(data.short_description, 'description')
			}
		})
	})

	describe('apps', () => {
		test('return the app infos', async () => {
			const db = await makeDB()
			const request = new Request('https://example.com', {
				method: 'POST',
				body: '{"redirect_uris":"mastodon://joinmastodon.org/oauth","website":"https://app.joinmastodon.org/ios","client_name":"Mastodon for iOS","scopes":"read write follow push"}',
			})

			const res = await apps.handleRequest(db, request)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			const { name, website, redirect_uri, client_id, client_secret, vapid_key, ...rest } = await res.json<
				Record<string, string>
			>()

			assert.equal(name, 'Mastodon for iOS')
			assert.equal(website, 'https://app.joinmastodon.org/ios')
			assert.equal(redirect_uri, 'mastodon://joinmastodon.org/oauth')
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
			const actorId = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const fromActorId = await createPerson(domain, db, userKEK, 'from@cloudflare.com')
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

			const res = await notifications.handleRequest(domain, db, connectedActor)
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
		test('get non existing subscription', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com')
			const client = await createTestClient(db)
			const connectedActor: any = { id: await createPerson(domain, db, userKEK, 'sven@cloudflare.com') }

			const res = await subscription.handleGetRequest(db, req, connectedActor, client.id)
			assert.equal(res.status, 404)
		})

		test('get existing subscription', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com')
			const client = await createTestClient(db)
			const connectedActor: any = { id: await createPerson(domain, db, userKEK, 'sven@cloudflare.com') }

			const data: any = {
				subscription: {
					endpoint: 'https://endpoint.com',
					keys: {
						p256dh: 'p256dh',
						auth: 'auth',
					},
				},
				data: {
					alerts: {},
					policy: 'all',
				},
			}
			await createSubscription(db, connectedActor, client, data)

			const res = await subscription.handleGetRequest(db, req, connectedActor, client.id)
			assert.equal(res.status, 200)

			const out = await res.json<any>()
			assert.equal(typeof out.id, 'number')
			assert.equal(out.endpoint, data.subscription.endpoint)
		})

		test('create subscription', async () => {
			const db = await makeDB()
			const client = await createTestClient(db)
			const connectedActor: any = { id: await createPerson(domain, db, userKEK, 'sven@cloudflare.com') }

			const data: any = {
				subscription: {
					endpoint: 'https://endpoint.com',
					keys: {
						p256dh: 'p256dh',
						auth: 'auth',
					},
				},
				data: {
					alerts: {},
					policy: 'all',
				},
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				body: JSON.stringify(data),
			})

			const res = await subscription.handlePostRequest(db, req, connectedActor, client.id)
			assert.equal(res.status, 200)

			const row: any = await db.prepare('SELECT * FROM subscriptions').first()
			assert.equal(row.actor_id, connectedActor.id.toString())
			assert.equal(row.client_id, client.id)
			assert.equal(row.endpoint, data.subscription.endpoint)
		})

		test('create subscriptions only creates one', async () => {
			const db = await makeDB()
			const client = await createTestClient(db)
			const connectedActor: any = { id: await createPerson(domain, db, userKEK, 'sven@cloudflare.com') }

			const data: any = {
				subscription: {
					endpoint: 'https://endpoint.com',
					keys: {
						p256dh: 'p256dh',
						auth: 'auth',
					},
				},
				data: {
					alerts: {},
					policy: 'all',
				},
			}
			await createSubscription(db, connectedActor, client, data)

			const req = new Request('https://example.com', {
				method: 'POST',
				body: JSON.stringify(data),
			})

			const res = await subscription.handlePostRequest(db, req, connectedActor, client.id)
			assert.equal(res.status, 200)

			const { count } = await db.prepare('SELECT count(*) as count FROM subscriptions').first()
			assert.equal(count, 1)
		})
	})
})
