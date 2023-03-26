import { strict as assert } from 'node:assert/strict'
import { createReply } from 'wildebeest/backend/test/shared.utils'
import { createStatus, getMentions } from 'wildebeest/backend/src/mastodon/status'
import { createPublicNote, type Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { createImage } from 'wildebeest/backend/src/activitypub/objects/image'
import * as statuses from 'wildebeest/functions/api/v1/statuses'
import * as statuses_id from 'wildebeest/functions/api/v1/statuses/[id]'
import * as statuses_favourite from 'wildebeest/functions/api/v1/statuses/[id]/favourite'
import * as statuses_reblog from 'wildebeest/functions/api/v1/statuses/[id]/reblog'
import * as statuses_context from 'wildebeest/functions/api/v1/statuses/[id]/context'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { insertLike } from 'wildebeest/backend/src/mastodon/like'
import { insertReblog } from 'wildebeest/backend/src/mastodon/reblog'
import { isUrlValid, makeDB, assertJSON, streamToArrayBuffer, makeQueue, makeCache } from '../utils'
import * as activities from 'wildebeest/backend/src/activitypub/activities'
import { addFollowing, acceptFollowing } from 'wildebeest/backend/src/mastodon/follow'
import { MessageType } from 'wildebeest/backend/src/types/queue'
import { MastodonStatus } from 'wildebeest/backend/src/types'
import { mastodonIdSymbol, getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import * as timelines from 'wildebeest/backend/src/mastodon/timeline'

const userKEK = 'test_kek4'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const domain = 'cloudflare.com'
const cache = makeCache()

describe('Mastodon APIs', () => {
	describe('statuses', () => {
		test('create new status missing params', async () => {
			const db = await makeDB()
			const queue = makeQueue()

			const body = { status: 'my status' }
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const connectedActor: any = {}
			const res = await statuses.handleRequest(req, db, connectedActor, userKEK, queue, cache)
			assert.equal(res.status, 400)
		})

		test('create new status creates Note', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'my status <script>evil</script>',
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const connectedActor = actor
			const res = await statuses.handleRequest(req, db, connectedActor, userKEK, queue, cache)
			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<MastodonStatus>()
			assert((data.uri as unknown as string).includes('example.com'))
			assert((data.uri as unknown as string).includes(data.id))
			// Required fields from https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Status.java
			assert(data.created_at !== undefined)
			assert(data.account !== undefined)
			assert(data.visibility !== undefined)
			assert(data.spoiler_text !== undefined)
			assert(data.media_attachments !== undefined)
			assert(data.mentions !== undefined)
			assert(data.tags !== undefined)
			assert(data.emojis !== undefined)
			assert(!isUrlValid(data.id))

			const row = await db
				.prepare(
					`
          SELECT
              ${db.qb.jsonExtract('properties', 'content')} as content,
              original_actor_id,
              original_object_id
          FROM objects
        `
				)
				.first<{ content: string; original_actor_id: URL; original_object_id: unknown }>()
			assert.equal(row.content, '<p>my status <p>evil</p></p>') // note the sanitization
			assert.equal(row.original_actor_id.toString(), actor.id.toString())
			assert.equal(row.original_object_id, null)
		})

		test('create new status regenerates the timeline and contains post', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const cache = makeCache()

			const body = {
				status: 'my status',
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<any>()

			const cachedData = await cache.get<any>(actor.id + '/timeline/home')
			assert(cachedData)
			assert.equal(cachedData.length, 1)
			assert.equal(cachedData[0].id, data.id)
		})

		test("create new status adds to Actor's outbox", async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'my status',
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const connectedActor = actor
			const res = await statuses.handleRequest(req, db, connectedActor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			const row = await db.prepare(`SELECT count(*) as count FROM outbox_objects`).first<{ count: number }>()
			assert.equal(row.count, 1)
		})

		test('create new status delivers to followers via Queue', async () => {
			const queue = makeQueue()
			const db = await makeDB()

			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const followerA = await createPerson(domain, db, userKEK, 'followerA@cloudflare.com')
			const followerB = await createPerson(domain, db, userKEK, 'followerB@cloudflare.com')

			await addFollowing(db, followerA, actor, 'not needed')
			await sleep(10)
			await addFollowing(db, followerB, actor, 'not needed')
			await acceptFollowing(db, followerA, actor)
			await acceptFollowing(db, followerB, actor)

			const body = { status: 'my status', visibility: 'public' }
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			assert.equal(queue.messages.length, 2)

			assert.equal(queue.messages[0].type, MessageType.Deliver)
			assert.equal(queue.messages[0].userKEK, userKEK)
			assert.equal(queue.messages[0].actorId, actor.id.toString())
			assert.equal(queue.messages[0].toActorId, followerA.id.toString())

			assert.equal(queue.messages[1].type, MessageType.Deliver)
			assert.equal(queue.messages[1].userKEK, userKEK)
			assert.equal(queue.messages[1].actorId, actor.id.toString())
			assert.equal(queue.messages[1].toActorId, followerB.id.toString())
		})

		test('create new status with mention delivers ActivityPub Note', async () => {
			let deliveredNote: Note | null = null

			globalThis.fetch = async (input: RequestInfo, data: any) => {
				if (input.toString() === 'https://remote.com/.well-known/webfinger?resource=acct%3Asven%40remote.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://social.com/users/sven',
								},
							],
						})
					)
				}

				if (input.toString() === 'https://social.com/users/sven') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/users/sven',
							type: 'Person',
							inbox: 'https://social.com/sven/inbox',
						})
					)
				}

				if (input === 'https://social.com/sven/inbox') {
					assert.equal(data.method, 'POST')
					const body = JSON.parse(data.body)
					deliveredNote = body
					return new Response()
				}

				// @ts-ignore: shut up
				if (Object.keys(input).includes('url') && input.url === 'https://social.com/sven/inbox') {
					const request = input as Request
					assert.equal(request.method, 'POST')
					const bodyB = await streamToArrayBuffer(request.body as ReadableStream)
					const dec = new TextDecoder()
					const body = JSON.parse(dec.decode(bodyB))
					deliveredNote = body
					return new Response()
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: '@sven@remote.com my status',
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const connectedActor = actor
			const res = await statuses.handleRequest(req, db, connectedActor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			assert(deliveredNote)
			assert.equal((deliveredNote as { type: string }).type, 'Create')
			assert.equal((deliveredNote as { actor: string }).actor, `https://${domain}/ap/users/sven`)
			assert.equal(
				(deliveredNote as { object: { attributedTo: string } }).object.attributedTo,
				`https://${domain}/ap/users/sven`
			)
			assert.equal((deliveredNote as { object: { type: string } }).object.type, 'Note')
			assert((deliveredNote as { object: { to: string[] } }).object.to.includes(activities.PUBLIC_GROUP))
			assert.equal((deliveredNote as { object: { cc: string[] } }).object.cc.length, 2)
		})

		test('create new status with mention add tags on Note', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			// @ts-ignore
			globalThis.fetch = async (input: any) => {
				if (
					(input as RequestInfo).toString() ===
					'https://cloudflare.com/.well-known/webfinger?resource=acct%3Asven%40cloudflare.com'
				) {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: actor.id,
								},
							],
						})
					)
				}

				if (input === actor.id.toString()) {
					return new Response(JSON.stringify(actor))
				}

				if (input.url === actor.inbox.toString()) {
					return new Response()
				}

				throw new Error('unexpected request to ' + JSON.stringify(input))
			}

			const body = {
				status: 'my status @sven@' + domain,
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const connectedActor = actor
			const res = await statuses.handleRequest(req, db, connectedActor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			const data = await res.json<any>()

			const note = (await getObjectByMastodonId(db, data.id)) as unknown as Note
			assert.equal(note.tag.length, 1)
			assert.equal(note.tag[0].href, actor.id.toString())
			assert.equal(note.tag[0].name, 'sven@' + domain)
		})

		test('create new status with image', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const properties = { url: 'https://example.com/image.jpg' }
			const image = await createImage(domain, db, connectedActor, properties)

			const body = {
				status: 'my status',
				media_ids: [image[mastodonIdSymbol]],
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, connectedActor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			const data = await res.json<any>()

			assert(!isUrlValid(data.id))
		})

		test('favourite status sends Like activity', async () => {
			let deliveredActivity: any = null

			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const originalObjectId = 'https://example.com/note123'

			await db
				.prepare(
					'INSERT INTO objects (id, type, properties, original_actor_id, original_object_id, local, mastodon_id) VALUES (?, ?, ?, ?, ?, 1, ?)'
				)
				.bind(
					'https://example.com/object1',
					'Note',
					JSON.stringify({ content: 'my first status' }),
					actor.id.toString(),
					originalObjectId,
					'mastodonid1'
				)
				.run()

			globalThis.fetch = async (input: RequestInfo) => {
				const request = new Request(input)
				if (request.url === actor.id.toString() + '/inbox') {
					assert.equal(request.method, 'POST')
					const body = await request.json()
					deliveredActivity = body
					return new Response()
				}

				throw new Error('unexpected request to ' + request.url)
			}

			const connectedActor: any = actor

			const res = await statuses_favourite.handleRequest(db, 'mastodonid1', connectedActor, userKEK, domain)
			assert.equal(res.status, 200)

			assert(deliveredActivity)
			assert.equal(deliveredActivity.type, 'Like')
			assert.equal(deliveredActivity.object, originalObjectId)
		})

		test('favourite records in db', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const note = await createPublicNote(domain, db, 'my first status', actor)

			const connectedActor: any = actor

			const res = await statuses_favourite.handleRequest(db, note[mastodonIdSymbol]!, connectedActor, userKEK, domain)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.favourited, true)

			const row = await db.prepare(`SELECT * FROM actor_favourites`).first<{ actor_id: string; object_id: string }>()
			assert.equal(row.actor_id, actor.id.toString())
			assert.equal(row.object_id, note.id.toString())
		})

		test('get mentions from status', async () => {
			const db = await makeDB()
			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === 'https://instance.horse/.well-known/webfinger?resource=acct%3Asven%40instance.horse') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://instance.horse/users/sven',
								},
							],
						})
					)
				}
				if (input.toString() === 'https://cloudflare.com/.well-known/webfinger?resource=acct%3Asven%40cloudflare.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://cloudflare.com/users/sven',
								},
							],
						})
					)
				}
				if (input.toString() === 'https://cloudflare.com/.well-known/webfinger?resource=acct%3Aa%40cloudflare.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://cloudflare.com/users/a',
								},
							],
						})
					)
				}
				if (input.toString() === 'https://cloudflare.com/.well-known/webfinger?resource=acct%3Ab%40cloudflare.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://cloudflare.com/users/b',
								},
							],
						})
					)
				}
				if (
					input.toString() === 'https://cloudflare.com/.well-known/webfinger?resource=acct%3Ano-json%40cloudflare.com'
				) {
					return new Response('not json', { status: 200 })
				}

				if (input.toString() === 'https://instance.horse/users/sven') {
					return new Response(
						JSON.stringify({
							id: 'https://instance.horse/users/sven',
							type: 'Person',
						})
					)
				}
				if (input.toString() === 'https://cloudflare.com/users/sven') {
					return new Response(
						JSON.stringify({
							id: 'https://cloudflare.com/users/sven',
							type: 'Person',
						})
					)
				}
				if (input.toString() === 'https://cloudflare.com/users/a') {
					return new Response(
						JSON.stringify({
							id: 'https://cloudflare.com/users/a',
							type: 'Person',
						})
					)
				}
				if (input.toString() === 'https://cloudflare.com/users/b') {
					return new Response(
						JSON.stringify({
							id: 'https://cloudflare.com/users/b',
							type: 'Person',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			{
				const mentions = await getMentions('test status', domain, db)
				assert.equal(mentions.length, 0)
			}

			{
				const mentions = await getMentions('no-json@actor.com', domain, db)
				assert.equal(mentions.length, 0)
			}

			{
				const mentions = await getMentions('@sven@instance.horse test status', domain, db)
				assert.equal(mentions.length, 1)
				assert.equal(mentions[0].id.toString(), 'https://instance.horse/users/sven')
			}

			{
				const mentions = await getMentions('@sven test status', domain, db)
				assert.equal(mentions.length, 1)
				assert.equal(mentions[0].id.toString(), 'https://' + domain + '/users/sven')
			}

			{
				const mentions = await getMentions('@a @b', domain, db)
				assert.equal(mentions.length, 2)
				assert.equal(mentions[0].id.toString(), 'https://' + domain + '/users/a')
				assert.equal(mentions[1].id.toString(), 'https://' + domain + '/users/b')
			}

			{
				const mentions = await getMentions('<p>@sven</p>', domain, db)
				assert.equal(mentions.length, 1)
				assert.equal(mentions[0].id.toString(), 'https://' + domain + '/users/sven')
			}

			{
				const mentions = await getMentions('<p>@unknown</p>', domain, db)
				assert.equal(mentions.length, 0)
			}
		})

		test('get status count likes', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			const actor3 = await createPerson(domain, db, userKEK, 'sven3@cloudflare.com')
			const note = await createPublicNote(domain, db, 'my first status', actor)

			await insertLike(db, actor2, note)
			await insertLike(db, actor3, note)

			const res = await statuses_id.handleRequestGet(db, note[mastodonIdSymbol]!, domain, actor)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			// FIXME: temporarly disable favourites counts
			assert.equal(data.favourites_count, 0)
		})

		test('get status with image', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const properties = { url: 'https://example.com/image.jpg' }
			const mediaAttachments = [await createImage(domain, db, actor, properties)]
			const note = await createPublicNote(domain, db, 'my first status', actor, mediaAttachments)

			const res = await statuses_id.handleRequestGet(db, note[mastodonIdSymbol]!, domain, actor)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.media_attachments.length, 1)
			assert.equal(data.media_attachments[0].url, properties.url)
			assert.equal(data.media_attachments[0].preview_url, properties.url)
			assert.equal(data.media_attachments[0].type, 'image')
		})

		test('status context shows descendants', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const note = await createStatus(domain, db, actor, 'a post')
			await sleep(10)

			await createReply(domain, db, actor, note, 'a reply')

			const res = await statuses_context.handleRequest(domain, db, note[mastodonIdSymbol]!)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.ancestors.length, 0)
			assert.equal(data.descendants.length, 1)
			assert.equal(data.descendants[0].content, 'a reply')
		})

		describe('reblog', () => {
			test('get status count reblogs', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
				const actor3 = await createPerson(domain, db, userKEK, 'sven3@cloudflare.com')
				const note = await createPublicNote(domain, db, 'my first status', actor)

				await insertReblog(db, actor2, note)
				await insertReblog(db, actor3, note)

				const res = await statuses_id.handleRequestGet(db, note[mastodonIdSymbol]!, domain, actor)
				assert.equal(res.status, 200)

				const data = await res.json<any>()
				// FIXME: temporarly disable reblogs counts
				assert.equal(data.reblogs_count, 0)
			})

			test('reblog records in db', async () => {
				const db = await makeDB()
				const queue = makeQueue()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const note = await createPublicNote(domain, db, 'my first status', actor)

				const connectedActor: any = actor

				const res = await statuses_reblog.handleRequest(
					db,
					note[mastodonIdSymbol]!,
					connectedActor,
					userKEK,
					queue,
					domain
				)
				assert.equal(res.status, 200)

				const data = await res.json<any>()
				assert.equal(data.reblogged, true)

				const row = await db.prepare(`SELECT * FROM actor_reblogs`).first<{ actor_id: string; object_id: string }>()
				assert.equal(row.actor_id, actor.id.toString())
				assert.equal(row.object_id, note.id.toString())
			})

			test('reblog status adds in actor outbox', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const queue = makeQueue()

				const note = await createPublicNote(domain, db, 'my first status', actor)

				const connectedActor: any = actor

				const res = await statuses_reblog.handleRequest(
					db,
					note[mastodonIdSymbol]!,
					connectedActor,
					userKEK,
					queue,
					domain
				)
				assert.equal(res.status, 200)

				const row = await db.prepare(`SELECT * FROM outbox_objects`).first<{ actor_id: string; object_id: string }>()
				assert.equal(row.actor_id, actor.id.toString())
				assert.equal(row.object_id, note.id.toString())
			})

			test('reblog remote status status sends Announce activity to author', async () => {
				let deliveredActivity: any = null

				const db = await makeDB()
				const queue = makeQueue()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const originalObjectId = 'https://example.com/note123'

				await db
					.prepare(
						'INSERT INTO objects (id, type, properties, original_actor_id, original_object_id, mastodon_id, local) VALUES (?, ?, ?, ?, ?, ?, 0)'
					)
					.bind(
						'https://example.com/object1',
						'Note',
						JSON.stringify({ content: 'my first status' }),
						actor.id.toString(),
						originalObjectId,
						'mastodonid1'
					)
					.run()

				globalThis.fetch = async (input: RequestInfo) => {
					const request = new Request(input)
					if (request.url === 'https://cloudflare.com/ap/users/sven/inbox') {
						assert.equal(request.method, 'POST')
						const body = await request.json()
						deliveredActivity = body
						return new Response()
					}

					throw new Error('unexpected request to ' + request.url)
				}

				const connectedActor: any = actor

				const res = await statuses_reblog.handleRequest(db, 'mastodonid1', connectedActor, userKEK, queue, domain)
				assert.equal(res.status, 200)

				assert(deliveredActivity)
				assert.equal(deliveredActivity.type, 'Announce')
				assert.equal(deliveredActivity.actor, actor.id.toString())
				assert.equal(deliveredActivity.object, originalObjectId)
			})
		})

		test('create new status in reply to non existing status', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'my reply',
				in_reply_to_id: 'hein',
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 404)
		})

		test('create new status in reply to', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const note = await createPublicNote(domain, db, 'my first status', actor)

			const body = {
				status: 'my reply',
				in_reply_to_id: note[mastodonIdSymbol],
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			const data = await res.json<any>()

			{
				const row = await db
					.prepare(
						`
                    SELECT ${db.qb.jsonExtract('properties', 'inReplyTo')} as inReplyTo
                    FROM objects
                    WHERE mastodon_id=?
                `
					)
					.bind(data.id)
					.first<{ inReplyTo: string }>()
				assert(row !== undefined)
				assert.equal(row.inReplyTo, note.id.toString())
			}

			{
				const row = await db.prepare('select * from actor_replies').first<{
					actor_id: string
					in_reply_to_object_id: string
				}>()
				assert(row !== undefined)
				assert.equal(row.actor_id, actor.id.toString())
				assert.equal(row.in_reply_to_object_id, note.id.toString())
			}
		})

		test('create new status with too many image', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'my status',
				media_ids: ['id', 'id', 'id', 'id', 'id'],
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 400)
			const data = await res.json<{ error: string }>()
			assert(data.error.includes('Limit exceeded'))
		})

		test('create new status sending multipart and too many image', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = new FormData()
			body.append('status', 'my status')
			body.append('visibility', 'public')
			body.append('media_ids[]', 'id')
			body.append('media_ids[]', 'id')
			body.append('media_ids[]', 'id')
			body.append('media_ids[]', 'id')
			body.append('media_ids[]', 'id')

			const req = new Request('https://example.com', {
				method: 'POST',
				body,
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 400)
			const data = await res.json<{ error: string }>()
			assert(data.error.includes('Limit exceeded'))
		})

		test('delete non-existing status', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const mastodonId = 'abcd'
			const res = await statuses_id.handleRequestDelete(db, mastodonId, actor, domain, userKEK, queue, cache)
			assert.equal(res.status, 404)
		})

		test('delete status from a different actor', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			const note = await createPublicNote(domain, db, 'note from actor2', actor2)

			const res = await statuses_id.handleRequestDelete(
				db,
				note[mastodonIdSymbol]!,
				actor,
				domain,
				userKEK,
				queue,
				cache
			)
			assert.equal(res.status, 404)
		})

		test('delete status remove DB rows', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const note = await createPublicNote(domain, db, 'note from actor', actor)
			await addObjectInOutbox(db, actor, note)

			const res = await statuses_id.handleRequestDelete(
				db,
				note[mastodonIdSymbol]!,
				actor,
				domain,
				userKEK,
				queue,
				cache
			)
			assert.equal(res.status, 200)

			{
				const { count } = await db.prepare(`SELECT count(*) as count FROM outbox_objects`).first<any>()
				assert.equal(count, 0)
			}
			{
				const { count } = await db.prepare(`SELECT count(*) as count FROM objects`).first<any>()
				assert.equal(count, 0)
			}
		})

		test('delete status regenerates the timeline', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const cache = makeCache()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const note = await createPublicNote(domain, db, 'note from actor', actor)
			await addObjectInOutbox(db, actor, note)

			// Poison the timeline
			await cache.put(actor.id.toString() + '/timeline/home', 'funny value')

			const res = await statuses_id.handleRequestDelete(
				db,
				note[mastodonIdSymbol]!,
				actor,
				domain,
				userKEK,
				queue,
				cache
			)
			assert.equal(res.status, 200)

			// ensure that timeline has been regenerated after the deletion
			// and that timeline is empty
			const timeline = await cache.get<Array<any>>(actor.id.toString() + '/timeline/home')
			assert(timeline)
			assert.equal(timeline!.length, 0)
		})

		test('delete status sends to followers', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			const actor3 = await createPerson(domain, db, userKEK, 'sven3@cloudflare.com')
			const note = await createPublicNote(domain, db, 'note from actor', actor)

			await addFollowing(db, actor2, actor, 'not needed')
			await acceptFollowing(db, actor2, actor)
			await addFollowing(db, actor3, actor, 'not needed')
			await acceptFollowing(db, actor3, actor)

			const res = await statuses_id.handleRequestDelete(
				db,
				note[mastodonIdSymbol]!,
				actor,
				domain,
				userKEK,
				queue,
				cache
			)
			assert.equal(res.status, 200)

			assert.equal(queue.messages.length, 2)
			assert.equal(queue.messages[0].activity.type, 'Delete')
			assert.equal(queue.messages[0].actorId, actor.id.toString())
			assert.equal(queue.messages[0].toActorId, actor2.id.toString())
			assert.equal(queue.messages[1].activity.type, 'Delete')
			assert.equal(queue.messages[1].actorId, actor.id.toString())
			assert.equal(queue.messages[1].toActorId, actor3.id.toString())
		})

		test('create duplicate statuses idempotency', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const idempotencyKey = 'abcd'

			const body = { status: 'my status', visibility: 'public' }
			const req = () =>
				new Request('https://example.com', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						'idempotency-key': idempotencyKey,
					},
					body: JSON.stringify(body),
				})

			const res1 = await statuses.handleRequest(req(), db, actor, userKEK, queue, cache)
			assert.equal(res1.status, 200)
			const data1 = await res1.json()

			const res2 = await statuses.handleRequest(req(), db, actor, userKEK, queue, cache)
			assert.equal(res2.status, 200)
			const data2 = await res2.json()

			assert.deepEqual(data1, data2)

			{
				const row = await db.prepare(`SELECT count(*) as count FROM objects`).first<{ count: number }>()
				assert.equal(row.count, 1)
			}

			{
				const row = await db.prepare(`SELECT count(*) as count FROM idempotency_keys`).first<{ count: number }>()
				assert.equal(row.count, 1)
			}
		})

		test('hashtag in status adds in note_hashtags table', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'hey #hi #car',
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			const data = await res.json<any>()

			const { results, success } = await db
				.prepare('SELECT value, object_id FROM note_hashtags')
				.all<{ value: string; object_id: string }>()
			assert(success)
			assert(results)
			assert.equal(results!.length, 2)
			assert.equal(results![0].value, 'hi')
			assert.equal(results![1].value, 'car')

			const note = (await getObjectByMastodonId(db, data.id)) as unknown as Note
			assert.equal(results![0].object_id, note.id.toString())
			assert.equal(results![1].object_id, note.id.toString())
		})

		test('reject statuses exceeding limits', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'a'.repeat(501),
				visibility: 'public',
			}
			const req = new Request('https://example.com', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 422)
			assertJSON(res)
		})

		test('create status with direct visibility', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor1 = await createPerson(domain, db, userKEK, 'actor1@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'actor2@cloudflare.com')

			let deliveredActivity1: any = null
			let deliveredActivity2: any = null

			globalThis.fetch = async (input: RequestInfo | Request) => {
				if (
					input.toString() === 'https://cloudflare.com/.well-known/webfinger?resource=acct%3Aactor1%40cloudflare.com'
				) {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: actor1.id,
								},
							],
						})
					)
				}
				if (
					input.toString() === 'https://cloudflare.com/.well-known/webfinger?resource=acct%3Aactor2%40cloudflare.com'
				) {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: actor2.id,
								},
							],
						})
					)
				}

				// @ts-ignore
				if (input.url === actor1.inbox.toString()) {
					deliveredActivity1 = await (input as Request).json()
					return new Response()
				}
				// @ts-ignore
				if (input.url === actor2.inbox.toString()) {
					deliveredActivity2 = await (input as Request).json()
					return new Response()
				}

				throw new Error('unexpected request to ' + input)
			}

			const body = {
				status: '@actor1 @actor2 hey',
				visibility: 'direct',
			}
			const req = new Request('https://' + domain, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 200)

			assert(deliveredActivity1)
			assert(deliveredActivity2)
			delete deliveredActivity1.id
			delete deliveredActivity2.id

			assert.deepEqual(deliveredActivity1, deliveredActivity2)
			assert.equal(deliveredActivity1.to.length, 2)
			assert.equal(deliveredActivity1.to[0], actor1.id.toString())
			assert.equal(deliveredActivity1.to[1], actor2.id.toString())
			assert.equal(deliveredActivity1.cc.length, 0)

			// ensure that the private note doesn't show up in public timeline
			const timeline = await timelines.getPublicTimeline(domain, db, timelines.LocalPreference.NotSet)
			assert.equal(timeline.length, 0)
		})

		test('create status with unlisted visibility', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'something nice',
				visibility: 'unlisted',
			}
			const req = new Request('https://' + domain, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 422)
			assertJSON(res)
		})

		test('create status with private visibility', async () => {
			const db = await makeDB()
			const queue = makeQueue()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const body = {
				status: 'something nice',
				visibility: 'private',
			}
			const req = new Request('https://' + domain, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})

			const res = await statuses.handleRequest(req, db, actor, userKEK, queue, cache)
			assert.equal(res.status, 422)
			assertJSON(res)
		})
	})
})
