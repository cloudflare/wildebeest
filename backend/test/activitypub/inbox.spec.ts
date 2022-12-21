import { makeDB, assertCache, isUrlValid } from '../utils'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import * as ap_inbox from 'wildebeest/functions/ap/users/[id]/inbox'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { strict as assert } from 'node:assert/strict'

const userKEK = 'test_kek9'

describe('ActivityPub', () => {
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

	test('records reblog in db', async () => {
		const db = await makeDB()
		const actorA: any = { id: await createPerson(db, userKEK, 'a@cloudflare.com') }
		const actorB: any = { id: await createPerson(db, userKEK, 'b@cloudflare.com') }

		const note = await createPublicNote(db, 'my first status', actorA)

		const activity: any = {
			type: 'Announce',
			actor: actorB.id,
			object: note.id,
		}
		const res = await ap_inbox.handleRequest(db, 'a', activity, userKEK)
		assert.equal(res.status, 200)

		const entry = await db.prepare('SELECT * FROM actor_reblogs').first()
		assert.equal(entry.actor_id, actorB.id)
		assert.equal(entry.object_id, note.id)
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
