import { makeDB, isUrlValid } from './utils'
import { MessageType } from 'wildebeest/backend/src/types/queue'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import { strict as assert } from 'node:assert/strict'
import { cacheObject } from 'wildebeest/backend/src/activitypub/objects/'
import * as ap_users from 'wildebeest/functions/ap/users/[id]'
import * as ap_outbox from 'wildebeest/functions/ap/users/[id]/outbox'
import * as ap_inbox from 'wildebeest/functions/ap/users/[id]/inbox'
import * as ap_outbox_page from 'wildebeest/functions/ap/users/[id]/outbox/page'

const userKEK = 'test_kek5'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const vapidKeys = {} as JWK
const domain = 'cloudflare.com'

describe('ActivityPub', () => {
	test('fetch non-existant user by id', async () => {
		const db = await makeDB()

		const res = await ap_users.handleRequest(domain, db, 'nonexisting')
		assert.equal(res.status, 404)
	})

	test('fetch user by id', async () => {
		const db = await makeDB()
		const properties = { summary: 'test summary' }
		const pubKey =
			'-----BEGIN PUBLIC KEY-----MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEApnI8FHJQXqqAdM87YwVseRUqbNLiw8nQ0zHBUyLylzaORhI4LfW4ozguiw8cWYgMbCufXMoITVmdyeTMGbQ3Q1sfQEcEjOZZXEeCCocmnYjK6MFSspjFyNw6GP0a5A/tt1tAcSlgALv8sg1RqMhSE5Kv+6lSblAYXcIzff7T2jh9EASnimaoAAJMaRH37+HqSNrouCxEArcOFhmFETadXsv+bHZMozEFmwYSTugadr4WD3tZd+ONNeimX7XZ3+QinMzFGOW19ioVHyjt3yCDU1cPvZIDR17dyEjByNvx/4N4Zly7puwBn6Ixy/GkIh5BWtL5VOFDJm/S+zcf1G1WsOAXMwKL4Nc5UWKfTB7Wd6voId7vF7nI1QYcOnoyh0GqXWhTPMQrzie4nVnUrBedxW0s/0vRXeR63vTnh5JrTVu06JGiU2pq2kvwqoui5VU6rtdImITybJ8xRkAQ2jo4FbbkS6t49PORIuivxjS9wPl7vWYazZtDVa5g/5eL7PnxOG3HsdIJWbGEh1CsG83TU9burHIepxXuQ+JqaSiKdCVc8CUiO++acUqKp7lmbYR9E/wRmvxXDFkxCZzA0UL2mRoLLLOe4aHvRSTsqiHC5Wwxyew5bb+eseJz3wovid9ZSt/tfeMAkCDmaCxEK+LGEbJ9Ik8ihis8Esm21N0A54sCAwEAAQ==-----END PUBLIC KEY-----'
		await db
			.prepare('INSERT INTO actors (id, email, type, properties, pubkey) VALUES (?, ?, ?, ?, ?)')
			.bind(`https://${domain}/ap/users/sven`, 'sven@cloudflare.com', 'Person', JSON.stringify(properties), pubKey)
			.run()

		const res = await ap_users.handleRequest(domain, db, 'sven')
		assert.equal(res.status, 200)

		const data = await res.json<any>()
		assert.equal(data.summary, 'test summary')
		assert(data.discoverable)
		assert(data['@context'])
		assert(isUrlValid(data.id))
		assert(isUrlValid(data.url))
		assert(isUrlValid(data.inbox))
		assert(isUrlValid(data.outbox))
		assert(isUrlValid(data.following))
		assert(isUrlValid(data.followers))
		assert.equal(data.publicKey.publicKeyPem, pubKey)
	})

	describe('Outbox', () => {
		test('return outbox', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			await addObjectInOutbox(db, actor, await createPublicNote(domain, db, 'my first status', actor))
			await addObjectInOutbox(db, actor, await createPublicNote(domain, db, 'my second status', actor))

			const res = await ap_outbox.handleRequest(domain, db, 'sven', userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollection')
			assert.equal(data.totalItems, 2)
		})

		test('return outbox page', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			await addObjectInOutbox(db, actor, await createPublicNote(domain, db, 'my first status', actor))
			await sleep(10)
			await addObjectInOutbox(db, actor, await createPublicNote(domain, db, 'my second status', actor))

			const res = await ap_outbox_page.handleRequest(domain, db, 'sven', userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollectionPage')
			assert.equal(data.orderedItems.length, 2)
			assert.equal(data.orderedItems[0].object.content, 'my second status')
			assert.equal(data.orderedItems[1].object.content, 'my first status')
		})
	})

	describe('Objects', () => {
		test('cacheObject deduplicates object', async () => {
			const db = await makeDB()
			const properties = { type: 'Note', a: 1, b: 2 }
			const actor = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
			const originalObjectId = new URL('https://example.com/object1')

			let result: any

			// Cache object once adds it to the database
			const res1: any = await cacheObject(domain, db, properties, actor.id, originalObjectId, false)
			assert.equal(res1.object.a, 1)
			assert.equal(res1.object.b, 2)
			assert(res1.created)

			result = await db.prepare('SELECT count(*) as count from objects').first()
			assert.equal(result.count, 1)

			// Cache object second time updates the first one
			properties.a = 3
			const res2: any = await cacheObject(domain, db, properties, actor.id, originalObjectId, false)
			// The creation date and properties don't change
			assert.equal(res1.object.a, res2.object.a)
			assert.equal(res1.object.b, res2.object.b)
			assert.equal(res1.object.published, res2.object.published)
			assert(!res2.created)

			result = await db.prepare('SELECT count(*) as count from objects').first()
			assert.equal(result.count, 1)
		})
	})

	describe('Inbox', () => {
		test('send Note to non existant user', async () => {
			const db = await makeDB()

			const queue = {
				async send() {},
			}

			const activity: any = {}
			const res = await ap_inbox.handleRequest(domain, db, 'sven', activity, queue, userKEK, vapidKeys)
			assert.equal(res.status, 404)
		})

		test('send activity sends message in queue', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			let msg: any = null

			const queue = {
				async send(v: any) {
					msg = v
				},
			}

			const activity: any = {
				type: 'some activity',
			}
			const res = await ap_inbox.handleRequest(domain, db, 'sven', activity, queue, userKEK, vapidKeys)
			assert.equal(res.status, 200)

			assert(msg)
			assert.equal(msg.type, MessageType.Inbox)
			assert.equal(msg.actorId, actor.id.toString())
			assert.equal(msg.activity.type, 'some activity')
		})
	})
})
