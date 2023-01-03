import * as notifications_get from 'wildebeest/functions/api/v1/notifications/[id]'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { insertNotification, insertFollowNotification } from 'wildebeest/backend/src/mastodon/notification'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import * as notifications from 'wildebeest/functions/api/v1/notifications'
import { makeDB, assertJSON, assertCORS, createTestClient } from '../utils'
import { strict as assert } from 'node:assert/strict'
import { sendLikeNotification } from 'wildebeest/backend/src/mastodon/notification'
import { createSubscription } from 'wildebeest/backend/src/mastodon/subscription'
import { generateVAPIDKeys, configure } from 'wildebeest/backend/src/config'
import { arrayBufferToBase64 } from 'wildebeest/backend/src/utils/key-ops'

const userKEK = 'test_kek15'
const domain = 'cloudflare.com'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
		test('returns notifications stored in db', async () => {
			const db = await makeDB()
			const actorId = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const fromActorId = await createPerson(domain, db, userKEK, 'from@cloudflare.com')

			const connectedActor: any = {
				id: actorId,
			}
			const note = await createPublicNote(domain, db, 'my first status', connectedActor)
			const fromActor: any = {
				id: fromActorId,
			}
			await insertFollowNotification(db, connectedActor, fromActor)
			await sleep(10)
			await insertNotification(db, 'favourite', connectedActor, fromActor, note)
			await sleep(10)
			await insertNotification(db, 'mention', connectedActor, fromActor, note)

			const res = await notifications.handleRequest(domain, db, connectedActor)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 3)

			assert.equal(data[0].type, 'mention')
			assert.equal(data[0].account.username, 'from')
			assert.equal(data[0].status.id, note.mastodonId)

			assert.equal(data[1].type, 'favourite')
			assert.equal(data[1].account.username, 'from')
			assert.equal(data[1].status.id, note.mastodonId)
			assert.equal(data[1].status.account.username, 'sven')

			assert.equal(data[2].type, 'follow')
			assert.equal(data[2].account.username, 'from')
			assert.equal(data[2].status, undefined)
		})

		test('get single non existant notification', async () => {
			const db = await makeDB()
			const actor: any = { id: await createPerson(domain, db, userKEK, 'sven@cloudflare.com') }
			const fromActor: any = { id: await createPerson(domain, db, userKEK, 'from@cloudflare.com') }
			const note = await createPublicNote(domain, db, 'my first status', actor)
			await insertNotification(db, 'favourite', actor, fromActor, note)

			const res = await notifications_get.handleRequest(domain, '1', db, actor)

			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.id, '1')
			assert.equal(data.type, 'favourite')
			assert.equal(data.account.acct, 'from@cloudflare.com')
			assert.equal(data.status.content, 'my first status')
		})

		test('send like notification', async () => {
			const db = await makeDB()
			await generateVAPIDKeys(db)
			await configure(db, { title: 'title', description: 'a', email: 'email' })

			const clientKeys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
				'sign',
				'verify',
			])) as CryptoKeyPair

			globalThis.fetch = async (input: RequestInfo, data: any) => {
				if (input === 'https://push.com') {
					assert(data.headers['Authorization'].includes('WebPush'))

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
			const actor: any = { id: await createPerson(domain, db, userKEK, 'sven@cloudflare.com') }

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

			const fromActor: any = {
				id: await createPerson(domain, db, userKEK, 'from@cloudflare.com'),
				icon: { url: 'icon.com' },
			}

			await sendLikeNotification(db, fromActor, actor)
		})
	})
})
