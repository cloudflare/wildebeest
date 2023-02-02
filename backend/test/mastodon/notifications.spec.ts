import * as notifications_get from 'wildebeest/functions/api/v1/notifications/[id]'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { createNotification, insertFollowNotification } from 'wildebeest/backend/src/mastodon/notification'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import * as notifications from 'wildebeest/functions/api/v1/notifications'
import { makeCache, makeDB, assertJSON, createTestClient } from '../utils'
import { strict as assert } from 'node:assert/strict'
import { sendLikeNotification } from 'wildebeest/backend/src/mastodon/notification'
import { createSubscription } from 'wildebeest/backend/src/mastodon/subscription'
import { arrayBufferToBase64 } from 'wildebeest/backend/src/utils/key-ops'
import { getNotifications } from 'wildebeest/backend/src/mastodon/notification'
import { mastodonIdSymbol } from 'wildebeest/backend/src/activitypub/objects'

const userKEK = 'test_kek15'
const domain = 'cloudflare.com'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const vapidKeys = {} as JWK

function parseCryptoKey(s: string): any {
	const parts = s.split(';')
	const out: any = {}
	for (let i = 0, len = parts.length; i < len; i++) {
		const parts2 = parts[i].split('=')
		out[parts2[0]] = parts2[1]
	}

	return out
}

describe('Mastodon APIs', () => {
	describe('notifications', () => {
		test('returns notifications stored in KV cache', async () => {
			const db = await makeDB()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const cache = makeCache()

			await cache.put(connectedActor.id + '/notifications', 12345)

			const req = new Request('https://' + domain)
			const data = await notifications.handleRequest(req, cache, connectedActor)
			assert.equal(await data.json(), 12345)
		})

		test('returns notifications stored in db', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const fromActor = await createPerson(domain, db, userKEK, 'from@cloudflare.com')

			const connectedActor = actor
			const note = await createPublicNote(domain, db, 'my first status', connectedActor)
			await insertFollowNotification(db, connectedActor, fromActor)
			await sleep(10)
			await createNotification(db, 'favourite', connectedActor, fromActor, note)
			await sleep(10)
			await createNotification(db, 'mention', connectedActor, fromActor, note)

			const notifications: any = await getNotifications(db, connectedActor, domain)

			assert.equal(notifications[0].type, 'mention')
			assert.equal(notifications[0].account.username, 'from')
			assert.equal(notifications[0].status.id, note[mastodonIdSymbol])

			assert.equal(notifications[1].type, 'favourite')
			assert.equal(notifications[1].account.username, 'from')
			assert.equal(notifications[1].status.id, note[mastodonIdSymbol])
			assert.equal(notifications[1].status.account.username, 'sven')

			assert.equal(notifications[2].type, 'follow')
			assert.equal(notifications[2].account.username, 'from')
			assert.equal(notifications[2].status, undefined)
		})

		test('get single favourite notification', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const fromActor = await createPerson(domain, db, userKEK, 'from@cloudflare.com')
			const note = await createPublicNote(domain, db, 'my first status', actor)
			await createNotification(db, 'favourite', actor, fromActor, note)

			const res = await notifications_get.handleRequest(domain, '1', db, actor)

			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.id, '1')
			assert.equal(data.type, 'favourite')
			assert.equal(data.account.acct, 'from@cloudflare.com')
			assert.equal(data.status.content, 'my first status')
		})

		test('get single follow notification', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const fromActor = await createPerson(domain, db, userKEK, 'from@cloudflare.com')
			await insertFollowNotification(db, actor, fromActor)

			const res = await notifications_get.handleRequest(domain, '1', db, actor)

			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.id, '1')
			assert.equal(data.type, 'follow')
			assert.equal(data.account.acct, 'from@cloudflare.com')
			assert.equal(data.status, undefined)
		})

		test('send like notification', async () => {
			const db = await makeDB()

			const clientKeys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
				'sign',
				'verify',
			])) as CryptoKeyPair

			globalThis.fetch = async (input: RequestInfo, data: any) => {
				if (input === 'https://push.com') {
					assert((data.headers['Authorization'] as string).includes('WebPush'))

					const cryptoKeyHeader = parseCryptoKey(data.headers['Crypto-Key'])
					assert(cryptoKeyHeader.dh)
					assert(cryptoKeyHeader.p256ecdsa)

					// Ensure the data has a valid signature using the client public key
					const sign = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, clientKeys.privateKey, data.body)
					assert(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, clientKeys.publicKey, sign, data.body))

					// TODO: eventually decrypt what the server pushed

					return new Response()
				}
				throw new Error('unexpected request to ' + input)
			}

			const client = await createTestClient(db)
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const p256dh = arrayBufferToBase64((await crypto.subtle.exportKey('raw', clientKeys.publicKey)) as ArrayBuffer)
			const auth = arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)))

			await createSubscription(db, actor, client, {
				subscription: {
					endpoint: 'https://push.com',
					keys: {
						p256dh,
						auth,
					},
				},
				data: {
					alerts: {},
					policy: 'all',
				},
			})

			const fromActor = await createPerson(domain, db, userKEK, 'from@cloudflare.com')
			await sendLikeNotification(db, fromActor, actor, 'notifid', 'admin@example.com', vapidKeys)
		})
	})
})
