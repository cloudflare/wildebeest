import { makeDB, assertCache, isUrlValid } from './utils'
import { addFollowing } from 'wildebeest/activitypub/actors/follow'
import { createPerson } from 'wildebeest/activitypub/actors'
import * as activityHandler from 'wildebeest/activitypub/activities/handle'
import { instanceConfig } from 'wildebeest/config/instance'
import { strict as assert } from 'node:assert/strict'

import * as ap_users from '../functions/ap/users/[id]'
import * as ap_inbox from '../functions/ap/users/[id]/inbox'

const userKEK = 'test_kek5'

describe('ActivityPub', () => {
	describe('Inbox', () => {
		test('send Note to non existant user', async () => {
			const db = await makeDB()

			const activity: any = {}
			const res = await ap_inbox.handleRequest(db, 'sven', activity, userKEK)
			assert.equal(res.status, 404)
		})

		test('send Note to inbox stores in DB', async () => {
			const db = await makeDB()
			const actorId = await createPerson(db, userKEK, 'sven@cloudflare.com')

			const activity: any = {
				type: 'Create',
				actor: actorId,
				to: [actorId],
				cc: [],
				object: {
					id: 'https://example.com/note1',
					type: 'Note',
					content: 'test note',
				},
			}
			const res = await ap_inbox.handleRequest(db, 'sven', activity, userKEK)
			assert.equal(res.status, 200)

			const entry = await db
				.prepare('SELECT objects.* FROM inbox_objects INNER JOIN objects ON objects.id=inbox_objects.object_id')
				.first()
			const properties = JSON.parse(entry.properties)
			assert.equal(properties.content, 'test note')
		})

		test('local actor sends Note with mention create notification', async () => {
			const db = await makeDB()
			const actorA = await createPerson(db, userKEK, 'a@cloudflare.com')
			const actorB = await createPerson(db, userKEK, 'b@cloudflare.com')

			const activity: any = {
				type: 'Create',
				actor: actorB,
				to: [actorA],
				cc: [],
				object: {
					id: 'https://example.com/note2',
					type: 'Note',
					content: 'test note',
				},
			}
			const res = await ap_inbox.handleRequest(db, 'a', activity, userKEK)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_notifications').first()
			assert.equal(entry.type, 'mention')
			assert.equal(entry.actor_id, actorA)
			assert.equal(entry.from_actor_id, actorB)
		})

		test('remote actor sends Note with mention create notification and download actor', async () => {
			const actorB = 'https://remote.com/actorb'

			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === actorB) {
					return new Response(
						JSON.stringify({
							id: actorB,
							type: 'Person',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			const actorA = await createPerson(db, userKEK, 'a@cloudflare.com')

			const activity: any = {
				type: 'Create',
				actor: actorB,
				to: [actorA],
				cc: [],
				object: {
					id: 'https://example.com/note3',
					type: 'Note',
					content: 'test note',
				},
			}
			const res = await ap_inbox.handleRequest(db, 'a', activity, userKEK)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actors WHERE id=?').bind(actorB).first()
			assert.equal(entry.id, actorB)
		})
	})

	test('fetch non-existant user by id', async () => {
		const db = await makeDB()

		const res = await ap_users.handleRequest(db, 'nonexisting')
		assert.equal(res.status, 404)
	})

	test('fetch user by id', async () => {
		const db = await makeDB()
		const properties = { summary: 'test summary' }
		const pubKey =
			'-----BEGIN PUBLIC KEY-----MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEApnI8FHJQXqqAdM87YwVseRUqbNLiw8nQ0zHBUyLylzaORhI4LfW4ozguiw8cWYgMbCufXMoITVmdyeTMGbQ3Q1sfQEcEjOZZXEeCCocmnYjK6MFSspjFyNw6GP0a5A/tt1tAcSlgALv8sg1RqMhSE5Kv+6lSblAYXcIzff7T2jh9EASnimaoAAJMaRH37+HqSNrouCxEArcOFhmFETadXsv+bHZMozEFmwYSTugadr4WD3tZd+ONNeimX7XZ3+QinMzFGOW19ioVHyjt3yCDU1cPvZIDR17dyEjByNvx/4N4Zly7puwBn6Ixy/GkIh5BWtL5VOFDJm/S+zcf1G1WsOAXMwKL4Nc5UWKfTB7Wd6voId7vF7nI1QYcOnoyh0GqXWhTPMQrzie4nVnUrBedxW0s/0vRXeR63vTnh5JrTVu06JGiU2pq2kvwqoui5VU6rtdImITybJ8xRkAQ2jo4FbbkS6t49PORIuivxjS9wPl7vWYazZtDVa5g/5eL7PnxOG3HsdIJWbGEh1CsG83TU9burHIepxXuQ+JqaSiKdCVc8CUiO++acUqKp7lmbYR9E/wRmvxXDFkxCZzA0UL2mRoLLLOe4aHvRSTsqiHC5Wwxyew5bb+eseJz3wovid9ZSt/tfeMAkCDmaCxEK+LGEbJ9Ik8ihis8Esm21N0A54sCAwEAAQ==-----END PUBLIC KEY-----'
		await db
			.prepare('INSERT INTO actors (id, email, type, properties, pubkey) VALUES (?, ?, ?, ?, ?)')
			.bind(
				'https://' + instanceConfig.uri + '/ap/users/sven',
				'sven@cloudflare.com',
				'Person',
				JSON.stringify(properties),
				pubKey
			)
			.run()

		const res = await ap_users.handleRequest(db, 'sven')
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

	describe('Accept', () => {
		beforeEach(() => {
			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === 'https://example.com/user/foo') {
					return new Response(
						JSON.stringify({
							id: 'https://example.com/users/foo',
							type: 'Person',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}
		})

		test('Accept follow request stores in db', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}
			await addFollowing(db, actor, actor2, 'not needed')

			const activity = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Accept',
				actor: { id: `https://${instanceConfig.uri}/ap/users/sven2` },
				object: {
					type: 'Follow',
					actor: actor.id,
					object: `https://${instanceConfig.uri}/ap/users/sven2`,
				},
			}

			await activityHandler.handle(activity, db, userKEK, 'inbox')

			const row = await db
				.prepare(`SELECT target_actor_id, state FROM actor_following WHERE actor_id=?`)
				.bind(actor.id)
				.first()
			assert(row)
			assert.equal(row.target_actor_id, 'https://social.eng.chat/ap/users/sven2')
			assert.equal(row.state, 'accepted')
		})

		test('Object must be an object', async () => {
			const db = await makeDB()
			const actor: any = { id: await createPerson(db, userKEK, 'sven@cloudflare.com') }

			const activity = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Accept',
				actor: 'https://example.com/actor',
				object: 'a',
			}

			assert.rejects(activityHandler.handle(activity, db, userKEK, 'inbox'), {
				message: '`activity.object` must be of type object',
			})
		})
	})

	describe('Create', () => {
		test('Object must be an object', async () => {
			const db = await makeDB()
			const actor: any = { id: await createPerson(db, userKEK, 'sven@cloudflare.com') }

			const activity = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Create',
				actor: 'https://example.com/actor',
				object: 'a',
			}

			assert.rejects(activityHandler.handle(activity, db, userKEK, 'inbox'), {
				message: '`activity.object` must be of type object',
			})
		})
	})

	describe('Follow', () => {
		let receivedActivity: any = null

		beforeEach(() => {
			receivedActivity = null

			globalThis.fetch = async (input: any) => {
				if (input.url === 'https://social.eng.chat/ap/users/sven2/inbox') {
					assert.equal(input.method, 'POST')
					const data = await input.json()
					receivedActivity = data
					console.log({ receivedActivity })
					return new Response('')
				}

				throw new Error('unexpected request to ' + input.url)
			}
		})

		test('Receive follow with Accept reply', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}

			const activity = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Follow',
				actor: actor2.id,
				object: actor.id,
			}

			await activityHandler.handle(activity, db, userKEK, 'inbox')

			const row = await db
				.prepare(`SELECT target_actor_id, state FROM actor_following WHERE actor_id=?`)
				.bind(actor2.id)
				.first()
			assert(row)
			assert.equal(row.target_actor_id, actor.id)
			assert.equal(row.state, 'accepted')

			assert(receivedActivity)
			assert.equal(receivedActivity.type, 'Accept')
			assert.equal(receivedActivity.actor, actor.id)
			assert.equal(receivedActivity.object.actor, activity.actor)
			assert.equal(receivedActivity.object.type, activity.type)
		})
	})
})
