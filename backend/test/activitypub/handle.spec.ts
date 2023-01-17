import { makeDB } from '../utils'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { strict as assert } from 'node:assert/strict'
import { cacheObject, getObjectById } from 'wildebeest/backend/src/activitypub/objects/'
import { addFollowing } from 'wildebeest/backend/src/mastodon/follow'
import * as activityHandler from 'wildebeest/backend/src/activitypub/activities/handle'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'

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

				const entry = await db.prepare('SELECT * FROM actor_reblogs').first()
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
				const actorA = await createPerson(domain, db, userKEK, 'a@cloudflare.com')
				const actorB = await createPerson(domain, db, userKEK, 'b@cloudflare.com')

				const note = await createPublicNote(domain, db, 'my first status', actorA)

				const activity: any = {
					type: 'Like',
					actor: actorB.id,
					object: note.id,
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const entry = await db.prepare('SELECT * FROM actor_favourites').first()
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

				const entry = await db.prepare('SELECT * FROM actor_notifications').first()
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

				const entry = await db.prepare('SELECT * FROM actor_favourites').first()
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
					.first()
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
					.first()
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

				const entry = await db.prepare('SELECT * FROM outbox_objects WHERE actor_id=?').bind(remoteActorId).first()
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

				const entry = await db.prepare('SELECT * FROM actor_notifications').first()
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

				const entry = await db.prepare('SELECT * FROM actor_replies').first()
				assert.equal(entry.actor_id, actor.id.toString().toString())

				const obj: any = await getObjectById(db, entry.object_id)
				assert(obj)
				assert.equal(obj.originalObjectId, 'https://example.com/note2')

				const inReplyTo: any = await getObjectById(db, entry.in_reply_to_object_id)
				assert(inReplyTo)
				assert.equal(inReplyTo.originalObjectId, 'https://example.com/note1')
			})

			test('preserve Note sent with `to`', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const activity: any = {
					type: 'Create',
					actor: actor.id.toString(),
					to: ['some actor'],
					cc: [],
					object: {
						id: 'https://example.com/note1',
						type: 'Note',
						content: 'test note',
					},
				}
				await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

				const row = await db.prepare('SELECT * FROM outbox_objects').first()
				assert.equal(row.target, 'some actor')
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

				const row = await db.prepare(`SELECT * from objects`).first()
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
					.first()
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

				const object = await db.prepare('SELECT * FROM objects').first()
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
	})
})
