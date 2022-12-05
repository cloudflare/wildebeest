import { makeDB, assertCache, isUrlValid } from '../utils'
import { generateVAPIDKeys, configure } from 'wildebeest/backend/src/config'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import * as ap_inbox from 'wildebeest/functions/ap/users/[id]/inbox'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { strict as assert } from 'node:assert/strict'

const userKEK = 'test_kek9'
const domain = 'cloudflare.com'

const kv_cache: any = {
	async put() {},
}

const waitUntil = async (p: Promise<any>) => await p

describe('ActivityPub', () => {
	test('send Note to non existant user', async () => {
		const db = await makeDB()

		const activity: any = {}
		const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'sven', activity, userKEK, waitUntil)
		assert.equal(res.status, 404)
	})

	test('send Note to inbox stores in DB', async () => {
		const db = await makeDB()
		await configure(db, { title: 'title', description: 'a', email: 'email' })
		await generateVAPIDKeys(db)
		const actorId = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

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
		const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'sven', activity, userKEK, waitUntil)
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
		await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

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
		const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'sven', activity, userKEK, waitUntil)
		assert.equal(res.status, 200)

		const entry = await db.prepare('SELECT * FROM outbox_objects WHERE actor_id=?').bind(remoteActorId).first()
		assert.equal(entry.actor_id, remoteActorId)
	})

	test('local actor sends Note with mention create notification', async () => {
		const db = await makeDB()
		await configure(db, { title: 'title', description: 'a', email: 'email' })
		await generateVAPIDKeys(db)
		const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
		const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

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
		const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'a', activity, userKEK, waitUntil)
		assert.equal(res.status, 200)

		const entry = await db.prepare('SELECT * FROM actor_notifications').first()
		assert.equal(entry.type, 'mention')
		assert.equal(entry.actor_id.toString(), actorA.toString())
		assert.equal(entry.from_actor_id.toString(), actorB.toString())
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
		await configure(db, { title: 'title', description: 'a', email: 'email' })
		await generateVAPIDKeys(db)
		const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')

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
		const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'a', activity, userKEK, waitUntil)
		assert.equal(res.status, 200)

		const entry = await db.prepare('SELECT * FROM actors WHERE id=?').bind(actorB).first()
		assert.equal(entry.id, actorB)
	})

	test('send Note records reply', async () => {
		const db = await makeDB()
		await configure(db, { title: 'title', description: 'a', email: 'email' })
		await generateVAPIDKeys(db)
		const actorId = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

		{
			const activity: any = {
				type: 'Create',
				actor: actorId,
				to: [actorId],
				object: {
					id: 'https://example.com/note1',
					type: 'Note',
					content: 'post',
				},
			}
			const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'sven', activity, userKEK, waitUntil)
			assert.equal(res.status, 200)
		}

		{
			const activity: any = {
				type: 'Create',
				actor: actorId,
				to: [actorId],
				object: {
					inReplyTo: 'https://example.com/note1',
					id: 'https://example.com/note2',
					type: 'Note',
					content: 'reply',
				},
			}
			const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'sven', activity, userKEK, waitUntil)
			assert.equal(res.status, 200)
		}

		const entry = await db.prepare('SELECT * FROM actor_replies').first()
		assert.equal(entry.actor_id, actorId.toString())

		const obj: any = await objects.getObjectById(db, entry.object_id)
		assert(obj)
		assert.equal(obj.originalObjectId, 'https://example.com/note2')

		const inReplyTo: any = await objects.getObjectById(db, entry.in_reply_to_object_id)
		assert(inReplyTo)
		assert.equal(inReplyTo.originalObjectId, 'https://example.com/note1')
	})

	describe('Announce', () => {
		test('records reblog in db', async () => {
			const db = await makeDB()
			await generateVAPIDKeys(db)
			await configure(db, { title: 'title', description: 'a', email: 'email' })
			const actorA: any = { id: await createPerson(domain, db, userKEK, 'a@cloudflare.com') }
			const actorB: any = { id: await createPerson(domain, db, userKEK, 'b@cloudflare.com') }

			const note = await createPublicNote(domain, db, 'my first status', actorA)

			const activity: any = {
				type: 'Announce',
				actor: actorB.id,
				object: note.id,
			}
			const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'a', activity, userKEK, waitUntil)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_reblogs').first()
			assert.equal(entry.actor_id.toString(), actorB.id.toString())
			assert.equal(entry.object_id.toString(), note.id.toString())
		})

		test('creates notification', async () => {
			const db = await makeDB()
			await configure(db, { title: 'title', description: 'a', email: 'email' })
			await generateVAPIDKeys(db)
			const actorA: any = { id: await createPerson(domain, db, userKEK, 'a@cloudflare.com') }
			const actorB: any = { id: await createPerson(domain, db, userKEK, 'b@cloudflare.com') }

			const note = await createPublicNote(domain, db, 'my first status', actorA)

			const activity: any = {
				type: 'Announce',
				actor: actorB.id,
				object: note.id,
			}
			const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'a', activity, userKEK, waitUntil)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_notifications').first()
			assert(entry)
			assert.equal(entry.type, 'reblog')
			assert.equal(entry.actor_id.toString(), actorA.id.toString())
			assert.equal(entry.from_actor_id.toString(), actorB.id.toString())
		})
	})

	describe('Like', () => {
		test('records like in db', async () => {
			const db = await makeDB()
			await configure(db, { title: 'title', description: 'a', email: 'email' })
			await generateVAPIDKeys(db)
			const actorA: any = { id: await createPerson(domain, db, userKEK, 'a@cloudflare.com') }
			const actorB: any = { id: await createPerson(domain, db, userKEK, 'b@cloudflare.com') }

			const note = await createPublicNote(domain, db, 'my first status', actorA)

			const activity: any = {
				type: 'Like',
				actor: actorB.id,
				object: note.id,
			}
			const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'a', activity, userKEK, waitUntil)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_favourites').first()
			assert.equal(entry.actor_id.toString(), actorB.id.toString())
			assert.equal(entry.object_id.toString(), note.id.toString())
		})

		test('creates notification', async () => {
			const db = await makeDB()
			await configure(db, { title: 'title', description: 'a', email: 'email' })
			await generateVAPIDKeys(db)
			const actorA: any = { id: await createPerson(domain, db, userKEK, 'a@cloudflare.com') }
			const actorB: any = { id: await createPerson(domain, db, userKEK, 'b@cloudflare.com') }

			const note = await createPublicNote(domain, db, 'my first status', actorA)

			const activity: any = {
				type: 'Like',
				actor: actorB.id,
				object: note.id,
			}
			const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'a', activity, userKEK, waitUntil)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_notifications').first()
			assert.equal(entry.type, 'favourite')
			assert.equal(entry.actor_id.toString(), actorA.id.toString())
			assert.equal(entry.from_actor_id.toString(), actorB.id.toString())
		})

		test('records like in db', async () => {
			const db = await makeDB()
			await configure(db, { title: 'title', description: 'a', email: 'email' })
			await generateVAPIDKeys(db)
			const actorA: any = { id: await createPerson(domain, db, userKEK, 'a@cloudflare.com') }
			const actorB: any = { id: await createPerson(domain, db, userKEK, 'b@cloudflare.com') }

			const note = await createPublicNote(domain, db, 'my first status', actorA)

			const activity: any = {
				type: 'Like',
				actor: actorB.id,
				object: note.id,
			}
			const res = await ap_inbox.handleRequest(domain, db, kv_cache, 'a', activity, userKEK, waitUntil)
			assert.equal(res.status, 200)

			const entry = await db.prepare('SELECT * FROM actor_favourites').first()
			assert.equal(entry.actor_id.toString(), actorB.id.toString())
			assert.equal(entry.object_id.toString(), note.id.toString())
		})
	})
})
