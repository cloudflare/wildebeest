import { createSubscription } from '../../src/mastodon/subscription'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { strict as assert } from 'node:assert/strict'
import { makeDB, createTestClient, generateVAPIDKeys, assertCORS } from '../utils'
import * as subscription from 'wildebeest/functions/api/v1/push/subscription'

const userKEK = 'test_kek21'
const domain = 'cloudflare.com'

describe('Mastodon APIs', () => {
	describe('subscriptions', () => {
		test('get non existing subscription', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const req = new Request('https://example.com')
			const client = await createTestClient(db)
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const res = await subscription.handleGetRequest(db, req, connectedActor, client.id, vapidKeys)
			assert.equal(res.status, 404)
			assertCORS(res)
		})

		test('get existing subscription', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const req = new Request('https://example.com')
			const client = await createTestClient(db)
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const data: any = {
				subscription: {
					endpoint: 'https://endpoint.com',
					keys: {
						p256dh: 'p256dh',
						auth: 'auth',
					},
				},
				data: {
					alerts: {
						follow: false,
						favourite: true,
						reblog: false,
						poll: true,
					},
					policy: 'followed',
				},
			}
			await createSubscription(db, connectedActor, client, data)

			const res = await subscription.handleGetRequest(db, req, connectedActor, client.id, vapidKeys)
			assert.equal(res.status, 200)

			const out = await res.json<any>()
			assert.equal(typeof out.id, 'number')
			assert.equal(out.endpoint, data.subscription.endpoint)
			assert.equal(out.alerts.follow, false)
			assert.equal(out.alerts.favourite, true)
			assert.equal(out.alerts.reblog, false)
			assert.equal(out.alerts.poll, true)
			assert.equal(out.policy, 'followed')
		})

		test('create subscription', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const client = await createTestClient(db)
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const data: any = {
				subscription: {
					endpoint: 'https://endpoint.com',
					keys: {
						p256dh: 'p256dh',
						auth: 'auth',
					},
				},
				data: {
					alerts: {
						poll: false,
						status: true,
					},
				},
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				body: JSON.stringify(data),
			})

			const res = await subscription.handlePostRequest(db, req, connectedActor, client.id, vapidKeys)
			assert.equal(res.status, 200)

			const out = await res.json<any>()
			assert.equal(out.alerts.mention, true)
			assert.equal(out.alerts.status, true) // default to true
			assert.equal(out.alerts.poll, false)
			assert.equal(out.policy, 'all') // default policy

			const row: any = await db.prepare('SELECT * FROM subscriptions').first()
			assert.equal(row.actor_id, connectedActor.id.toString())
			assert.equal(row.client_id, client.id)
			assert.equal(row.endpoint, data.subscription.endpoint)
			assert.equal(row.alert_poll, 0)
			assert.equal(row.alert_mention, 1)
			assert.equal(row.alert_status, 1) // default to true
			assert.equal(row.policy, 'all') // default policy
		})

		test('create subscriptions only creates one', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const client = await createTestClient(db)
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

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

			const res = await subscription.handlePostRequest(db, req, connectedActor, client.id, vapidKeys)
			assert.equal(res.status, 200)

			const { count } = await db.prepare('SELECT count(*) as count FROM subscriptions').first<{ count: number }>()
			assert.equal(count, 1)
		})

		test('subscriptions auto increment', async () => {
			const db = await makeDB()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

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

			const client1 = await createTestClient(db)
			const sub1 = await createSubscription(db, connectedActor, client1, data)
			assert.equal(sub1.id, 1)

			const client2 = await createTestClient(db)
			const sub2 = await createSubscription(db, connectedActor, client2, data)
			assert.equal(sub2.id, 2)

			const client3 = await createTestClient(db)
			const sub3 = await createSubscription(db, connectedActor, client3, data)
			assert.equal(sub3.id, 3)
		})
	})
})
