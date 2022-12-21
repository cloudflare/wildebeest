import { makeDB, assertCache, isUrlValid } from './utils'
import { addFollowing, acceptFollowing } from 'wildebeest/activitypub/actors/follow'
import { createPerson } from 'wildebeest/activitypub/actors'
import * as activityHandler from 'wildebeest/activitypub/activities/handle'
import { instanceConfig } from 'wildebeest/config/instance'
import { createPublicNote } from 'wildebeest/activitypub/objects/note'
import { addObjectInOutbox } from 'wildebeest/activitypub/actors/outbox'
import { strict as assert } from 'node:assert/strict'

import * as ap_users from '../functions/ap/users/[id]'
import * as ap_inbox from '../functions/ap/users/[id]/inbox'
import * as ap_outbox from '../functions/ap/users/[id]/outbox'
import * as ap_following from '../functions/ap/users/[id]/following'
import * as ap_followers from '../functions/ap/users/[id]/followers'
import * as ap_followers_page from '../functions/ap/users/[id]/followers/page'
import * as ap_following_page from '../functions/ap/users/[id]/following/page'
import * as ap_outbox_page from '../functions/ap/users/[id]/outbox/page'

const userKEK = 'test_kek5'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

		test("send Note adds in remote actor's outbox", async () => {
			const remoteActorId = 'https://example.com/actor'

			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === remoteActorId) {
					return new Response(
						JSON.stringify({
							id: remoteActorId,
							type: 'Person',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			await createPerson(db, userKEK, 'sven@cloudflare.com')

			const activity: any = {
				type: 'Create',
				actor: remoteActorId,
				to: [],
				cc: [],
				object: {
					id: 'https://example.com/note1',
					type: 'Note',
					content: 'test note',
				},
			}
			const res = await ap_inbox.handleRequest(db, 'sven', activity, userKEK)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM outbox_objects WHERE actor_id=?').bind(remoteActorId).first()
			assert.equal(entry.actor_id, remoteActorId)
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

		test('list actor following', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}
			const actor3: any = {
				id: await createPerson(db, userKEK, 'sven3@cloudflare.com'),
			}
			await addFollowing(db, actor, actor2, 'not needed')
			await acceptFollowing(db, actor, actor2)
			await addFollowing(db, actor, actor3, 'not needed')
			await acceptFollowing(db, actor, actor3)

			const res = await ap_following.handleRequest(db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollection')
			assert.equal(data.totalItems, 2)
		})

		test('list actor following page', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}
			const actor3: any = {
				id: await createPerson(db, userKEK, 'sven3@cloudflare.com'),
			}
			await addFollowing(db, actor, actor2, 'not needed')
			await acceptFollowing(db, actor, actor2)
			await addFollowing(db, actor, actor3, 'not needed')
			await acceptFollowing(db, actor, actor3)

			const res = await ap_following_page.handleRequest(db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollectionPage')
			assert.equal(data.orderedItems[0], `https://${instanceConfig.uri}/ap/users/sven2`)
			assert.equal(data.orderedItems[1], `https://${instanceConfig.uri}/ap/users/sven3`)
		})

		test('list actor follower', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}
			await addFollowing(db, actor2, actor, 'not needed')
			await acceptFollowing(db, actor2, actor)

			const res = await ap_followers.handleRequest(db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollection')
			assert.equal(data.totalItems, 1)
		})

		test('list actor follower page', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}
			await addFollowing(db, actor2, actor, 'not needed')
			await acceptFollowing(db, actor2, actor)

			const res = await ap_followers_page.handleRequest(db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollectionPage')
			assert.equal(data.orderedItems[0], `https://${instanceConfig.uri}/ap/users/sven2`)
		})
	})

	describe('Outbox', () => {
		test('return outbox', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}

			await addObjectInOutbox(db, actor, await createPublicNote(db, 'my first status', actor))
			await addObjectInOutbox(db, actor, await createPublicNote(db, 'my second status', actor))

			const res = await ap_outbox.handleRequest(db, 'sven', userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollection')
			assert.equal(data.totalItems, 2)
		})

		test('return outbox page', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}

			await addObjectInOutbox(db, actor, await createPublicNote(db, 'my first status', actor))
			await sleep(10)
			await addObjectInOutbox(db, actor, await createPublicNote(db, 'my second status', actor))

			const res = await ap_outbox_page.handleRequest(db, 'sven', userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollectionPage')
			assert.equal(data.orderedItems.length, 2)
			assert.equal(data.orderedItems[0].object.content, 'my second status')
			assert.equal(data.orderedItems[1].object.content, 'my first status')
		})
	})

	describe('Announce', () => {
		test('Announce objects are stored and added to the remote actors outbox', async () => {
			const remoteActorId = 'https://example.com/actor'
			const objectId = 'https://example.com/some-object'
			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === remoteActorId) {
					return new Response(
						JSON.stringify({
							id: remoteActorId,
							type: 'Person',
						})
					)
				}

				if (input.toString() === objectId) {
					return new Response(
						JSON.stringify({
							id: objectId,
							type: 'Note',
							content: 'foo',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			const actor: any = { id: await createPerson(db, userKEK, 'sven@cloudflare.com') }

			const activity: any = {
				type: 'Announce',
				actor: remoteActorId,
				to: [],
				cc: [],
				object: objectId,
			}
			await activityHandler.handle(activity, db, userKEK, 'inbox')

			const object = await db.prepare('SELECT * FROM objects').bind(remoteActorId).first()
			assert(object)
			assert.equal(object.type, 'Note')
			assert.equal(object.original_actor_id, remoteActorId)

			const outbox_object = await db
				.prepare('SELECT * FROM outbox_objects WHERE actor_id=?')
				.bind(remoteActorId)
				.first()
			assert(outbox_object)
			assert.equal(outbox_object.actor_id, remoteActorId)
		})
	})

	describe('Like', () => {
		test('creates notification', async () => {
			const db = await makeDB()
			const actorA: any = { id: await createPerson(db, userKEK, 'a@cloudflare.com') }
			const actorB: any = { id: await createPerson(db, userKEK, 'b@cloudflare.com') }

			const note = await createPublicNote(db, 'my first status', actorA)

			const activity: any = {
				type: 'Like',
				actor: actorB.id,
				object: note.id,
			}
			const res = await ap_inbox.handleRequest(db, 'a', activity, userKEK)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_notifications').first()
			assert.equal(entry.type, 'favourite')
			assert.equal(entry.actor_id, actorA.id)
			assert.equal(entry.from_actor_id, actorB.id)
		})

		test('records like in db', async () => {
			const db = await makeDB()
			const actorA: any = { id: await createPerson(db, userKEK, 'a@cloudflare.com') }
			const actorB: any = { id: await createPerson(db, userKEK, 'b@cloudflare.com') }

			const note = await createPublicNote(db, 'my first status', actorA)

			const activity: any = {
				type: 'Like',
				actor: actorB.id,
				object: note.id,
			}
			const res = await ap_inbox.handleRequest(db, 'a', activity, userKEK)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_favourites').first()
			assert.equal(entry.actor_id, actorB.id)
			assert.equal(entry.object_id, note.id)
		})
	})
})
