import { makeDB } from '../utils'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { strict as assert } from 'node:assert/strict'
import { cacheObject, getObjectById } from 'wildebeest/backend/src/activitypub/objects/'
import { addFollowing } from 'wildebeest/backend/src/mastodon/follow'
import * as activityHandler from 'wildebeest/backend/src/activitypub/activities/handle'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { ObjectsRow } from 'wildebeest/backend/src/types/objects'
import { originalObjectIdSymbol } from 'wildebeest/backend/src/activitypub/objects'

const adminEmail = 'admin@example.com'
const domain = 'cloudflare.com'
const userKEK = 'test_kek15'
const vapidKeys = {} as JWK

describe('ActivityPub', () => {
	describe('handle Activity', () => {
		describe('Announce', () => {
			test('records reblog in db', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const note = await createPublicNote(domain, db, 'my first status', actorA)

				const activity: any = {
					type: 'Announce',
					actor: actorB.id,
					object: note.id,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db.prepare('SELECT * FROM actor_reblogs').first<{
					actor_id: URL
					object_id: URL
				}>()
				assert.equal(entry.actor_id.toString(), actorB.id.toString())
				assert.equal(entry.object_id.toString(), note.id.toString())
			})

			test('creates notification', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const note = await createPublicNote(domain, db, 'my first status', actorA)

				const activity: any = {
					type: 'Announce',
					actor: actorB.id,
					object: note.id,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db.prepare('SELECT * FROM actor_notifications').first<{
					type: string
					actor_id: URL
					from_actor_id: URL
				}>()
				assert(entry)
				assert.equal(entry.type, 'reblog')
				assert.equal(entry.actor_id.toString(), actorA.id.toString())
				assert.equal(entry.from_actor_id.toString(), actorB.id.toString())
			})
		})

		describe('Like', () => {
			test('records like in db', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const note = await createPublicNote(domain, db, 'my first status', actorA)

				const activity: any = {
					type: 'Like',
					actor: actorB.id,
					object: note.id,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db.prepare('SELECT * FROM actor_favourites').first<{ actor_id: URL; object_id: URL }>()
				assert.equal(entry.actor_id.toString(), actorB.id.toString())
				assert.equal(entry.object_id.toString(), note.id.toString())
			})

			test('creates notification', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const note = await createPublicNote(domain, db, 'my first status', actorA)

				const activity: any = {
					type: 'Like',
					actor: actorB.id,
					object: note.id,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db.prepare('SELECT * FROM actor_notifications').first<{
					type: string
					actor_id: URL
					from_actor_id: URL
				}>()
				assert.equal(entry.type, 'favourite')
				assert.equal(entry.actor_id.toString(), actorA.id.toString())
				assert.equal(entry.from_actor_id.toString(), actorB.id.toString())
			})

			test('records like in db', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const note = await createPublicNote(domain, db, 'my first status', actorA)

				const activity: any = {
					type: 'Like',
					actor: actorB.id,
					object: note.id,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db.prepare('SELECT * FROM actor_favourites').first<{
					actor_id: URL
					object_id: URL
				}>()
				assert.equal(entry.actor_id.toString(), actorB.id.toString())
				assert.equal(entry.object_id.toString(), note.id.toString())
			})
		})

		describe('Accept', () => {
			beforeEach(() => {
				globalThis.fetch = async (input: RequestInfo) => {
					throw new Error('unexpected request to ' + input)
				}
			})

			test('Accept follow request stores in db', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
				await addFollowing(db, actor, actor2, 'not needed')

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Accept',
					actor: { id: 'https://' + domain + '/ap/users/sven2' },
					object: {
						type: 'Follow',
						actor: actor.id,
						object: 'https://' + domain + '/ap/users/sven2',
					},
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const row = await db
					.prepare(`SELECT target_actor_id, state FROM actor_following WHERE actor_id=?`)
					.bind(actor.id.toString())
					.first<{
						target_actor_id: string
						state: string
					}>()
				assert(row)
				assert.equal(row.target_actor_id, 'https://' + domain + '/ap/users/sven2')
				assert.equal(row.state, 'accepted')
			})

			test('Object must be an object', async () => {
				const db = await makeDB()
				await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Accept',
					actor: 'https://example.com/actor',
					object: 'a',
				}

				await assert.rejects(activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys), {
					message: '`activity.object` must be of type object',
				})
			})
		})

		describe('Create', () => {
			test('Object must be an object', async () => {
				const db = await makeDB()
				await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Create',
					actor: 'https://example.com/actor',
					object: 'a',
				}

				await assert.rejects(activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys), {
					message: '`activity.object` must be of type object',
				})
			})

			test('Note to inbox stores in DB', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity: any = {
					type: 'Create',
					actor: actor.id.toString(),
					to: [actor.id.toString()],
					cc: [],
					object: {
						id: 'https://example.com/note1',
						type: 'Note',
						content: 'test note',
					},
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db
					.prepare('SELECT objects.* FROM inbox_objects INNER JOIN objects ON objects.id=inbox_objects.object_id')
					.first<ObjectsRow>()
				const properties = JSON.parse(entry.properties)
				assert.equal(properties.content, 'test note')
			})

			test("Note adds in remote actor's outbox", async () => {
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
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db
					.prepare('SELECT * FROM outbox_objects WHERE actor_id=?')
					.bind(remoteActorId)
					.first<{ actor_id: string }>()
				assert.equal(entry.actor_id, remoteActorId)
			})

			test('local actor sends Note with mention create notification', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const activity: any = {
					type: 'Create',
					actor: actorB.id.toString(),
					to: [actorA.id.toString()],
					cc: [],
					object: {
						id: 'https://example.com/note2',
						type: 'Note',
						content: 'test note',
					},
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db.prepare('SELECT * FROM actor_notifications').first<{
					type: string
					actor_id: URL
					from_actor_id: URL
				}>()
				assert(entry)
				assert.equal(entry.type, 'mention')
				assert.equal(entry.actor_id.toString(), actorA.id.toString())
				assert.equal(entry.from_actor_id.toString(), actorB.id.toString())
			})

			test('Note records reply', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				{
					const activity: any = {
						type: 'Create',
						actor: actor.id.toString(),
						to: [actor.id.toString()],
						object: {
							id: 'https://example.com/note1',
							type: 'Note',
							content: 'post',
						},
					}
					await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)
				}

				{
					const activity: any = {
						type: 'Create',
						actor: actor.id.toString(),
						to: [actor.id.toString()],
						object: {
							inReplyTo: 'https://example.com/note1',
							id: 'https://example.com/note2',
							type: 'Note',
							content: 'reply',
						},
					}
					await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)
				}

				const entry = await db.prepare('SELECT * FROM actor_replies').first<{
					actor_id: string
					object_id: string
					in_reply_to_object_id: string
				}>()
				assert.equal(entry.actor_id, actor.id.toString().toString())

				const obj: any = await getObjectById(db, entry.object_id)
				assert(obj)
				assert.equal(obj[originalObjectIdSymbol], 'https://example.com/note2')

				const inReplyTo: any = await getObjectById(db, entry.in_reply_to_object_id)
				assert(inReplyTo)
				assert.equal(inReplyTo[originalObjectIdSymbol], 'https://example.com/note1')
			})

			test('preserve Note sent with `to`', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity = {
					type: 'Create',
					actor: actor.id.toString(),
					to: ['https://example.com/some-actor'],
					cc: [],
					object: {
						id: 'https://example.com/note1',
						type: 'Note',
						content: 'test note',
					},
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const row = await db.prepare('SELECT * FROM outbox_objects').first<{ target: string }>()
				assert.equal(row.target, 'https://example.com/some-actor')
			})

			test('Object props get sanitized', async () => {
				const db = await makeDB()
				const person = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Create',
					actor: person,
					object: {
						id: 'https://example.com/note2',
						type: 'Note',
						name: '<script>Dr Evil</script>',
						content:
							'<div><span class="bad h-10 p-100\tu-22\r\ndt-xi e-bam mention hashtag ellipsis invisible o-bad">foo</span><br/><p><a href="blah"><b>bold</b></a></p><script>alert("evil")</script></div>',
					},
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const row = await db.prepare(`SELECT * from objects`).first<ObjectsRow>()
				const { content, name } = JSON.parse(row.properties)
				assert.equal(
					content,
					'<p><span class="h-10 p-100 u-22 dt-xi e-bam mention hashtag ellipsis invisible">foo</span><br/><p><a href="blah"><p>bold</p></a></p><p>alert("evil")</p></p>'
				)
				assert.equal(name, 'Dr Evil')
			})
		})

		describe('Update', () => {
			test('Object must be an object', async () => {
				const db = await makeDB()

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Update',
					actor: 'https://example.com/actor',
					object: 'a',
				}

				await assert.rejects(activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys), {
					message: '`activity.object` must be of type object',
				})
			})

			test('Object must exist', async () => {
				const db = await makeDB()

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Update',
					actor: 'https://example.com/actor',
					object: {
						id: 'https://example.com/note2',
						type: 'Note',
						content: 'test note',
					},
				}

				await assert.rejects(activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys), {
					message: 'object https://example.com/note2 does not exist',
				})
			})

			test('Object must have the same origin', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const object = {
					id: 'https://example.com/note2',
					type: 'Note',
					content: 'test note',
				}

				const obj = await cacheObject(domain, db, object, actor.id, new URL(object.id), false)
				assert.notEqual(obj, null, 'could not create object')

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Update',
					actor: 'https://example.com/actor',
					object: object,
				}

				await assert.rejects(activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys), {
					message: 'actorid mismatch when updating object',
				})
			})

			test('Object is updated', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const object = {
					id: 'https://example.com/note2',
					type: 'Note',
					content: 'test note',
				}

				const obj = await cacheObject(domain, db, object, actor.id, new URL(object.id), false)
				assert.notEqual(obj, null, 'could not create object')

				const newObject = {
					id: 'https://example.com/note2',
					type: 'Note',
					content: 'new test note',
				}

				const activity = {
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'Update',
					actor: actor.id,
					object: newObject,
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const updatedObject = await db
					.prepare('SELECT * FROM objects WHERE original_object_id=?')
					.bind(object.id)
					.first<ObjectsRow>()
				assert(updatedObject)
				assert.equal(JSON.parse(updatedObject.properties).content, newObject.content)
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
								icon: { url: 'img.com' },
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
				await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity: any = {
					type: 'Announce',
					actor: remoteActorId,
					to: [],
					cc: [],
					object: objectId,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const object = await db.prepare('SELECT * FROM objects').first<{
					type: string
					original_actor_id: string
				}>()
				assert(object)
				assert.equal(object.type, 'Note')
				assert.equal(object.original_actor_id, remoteActorId)

				const outbox_object = await db
					.prepare('SELECT * FROM outbox_objects WHERE actor_id=?')
					.bind(remoteActorId)
					.first<{ actor_id: string }>()
				assert(outbox_object)
				assert.equal(outbox_object.actor_id, remoteActorId)
			})

			test('duplicated announce', async () => {
				const remoteActorId = 'https://example.com/actor'
				const objectId = 'https://example.com/some-object'
				globalThis.fetch = async (input: RequestInfo) => {
					if (input.toString() === remoteActorId) {
						return new Response(
							JSON.stringify({
								id: remoteActorId,
								icon: { url: 'img.com' },
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
				await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity: any = {
					type: 'Announce',
					actor: remoteActorId,
					to: [],
					cc: [],
					object: objectId,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				// Handle the same Activity
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				// Ensure only one reblog is kept
				const { count } = await db.prepare('SELECT count(*) as count FROM outbox_objects').first<{ count: number }>()
				assert.equal(count, 1)
			})
		})

		describe('Delete', () => {
			test('delete Note', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const originalObjectId = 'https://example.com/note123'

				await db
					.prepare(
						'INSERT INTO objects (id, type, properties, original_actor_id, original_object_id, local, mastodon_id) VALUES (?, ?, ?, ?, ?, 1, ?)'
					)
					.bind(
						'https://example.com/object1',
						'Note',
						JSON.stringify({ content: 'my first status' }),
						actorA.id.toString(),
						originalObjectId,
						'mastodonid1'
					)
					.run()

				const activity: any = {
					type: 'Delete',
					actor: actorA.id,
					to: [],
					cc: [],
					object: originalObjectId,
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const { count } = await db.prepare('SELECT count(*) as count FROM objects').first<{ count: number }>()
				assert.equal(count, 0)
			})

			test('delete Tombstone', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const originalObjectId = 'https://example.com/note456'

				await db
					.prepare(
						'INSERT INTO objects (id, type, properties, original_actor_id, original_object_id, local, mastodon_id) VALUES (?, ?, ?, ?, ?, 1, ?)'
					)
					.bind(
						'https://example.com/object1',
						'Note',
						JSON.stringify({ content: 'my first status' }),
						actorA.id.toString(),
						originalObjectId,
						'mastodonid1'
					)
					.run()

				const activity: any = {
					type: 'Delete',
					actor: actorA.id,
					to: [],
					cc: [],
					object: {
						type: 'Tombstone',
						id: originalObjectId,
					},
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const { count } = await db.prepare('SELECT count(*) as count FROM objects').first<{ count: number }>()
				assert.equal(count, 0)
			})

			test('reject Note deletion from another Actor', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const originalObjectId = 'https://example.com/note123'

				// ActorB creates a Note
				await db
					.prepare(
						'INSERT INTO objects (id, type, properties, original_actor_id, original_object_id, local, mastodon_id) VALUES (?, ?, ?, ?, ?, 1, ?)'
					)
					.bind(
						'https://example.com/object1',
						'Note',
						JSON.stringify({ content: 'my first status' }),
						actorB.id.toString(),
						originalObjectId,
						'mastodonid1'
					)
					.run()

				const activity: any = {
					type: 'Delete',
					actor: actorA.id, // ActorA attempts to delete
					to: [],
					cc: [],
					object: actorA.id,
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				// Ensure that we didn't actually delete the object
				const { count } = await db.prepare('SELECT count(*) as count FROM objects').first<{ count: number }>()
				assert.equal(count, 1)
			})

			test('ignore deletion of an Actor', async () => {
				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')

				const activity: any = {
					type: 'Delete',
					actor: actorA.id,
					to: [],
					cc: [],
					object: actorA.id,
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				// Ensure that we didn't actually delete the actor
				const { count } = await db.prepare('SELECT count(*) as count FROM actors').first<{ count: number }>()
				assert.equal(count, 1)
			})

			test('ignore deletion of a local Note', async () => {
				// Deletion of local Note should only be done using Mastodon API
				// (ie ActivityPub client-to-server).

				const db = await makeDB()
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')

				const note = await createPublicNote(domain, db, 'my first status', actorA)

				const activity: any = {
					type: 'Delete',
					actor: actorA.id,
					to: [],
					cc: [],
					object: note.id,
				}

				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const { count } = await db.prepare('SELECT count(*) as count FROM objects').first<{ count: number }>()
				assert.equal(count, 1)
			})
		})
	})
})
