import { strict as assert } from 'node:assert/strict'
import { createImage } from 'wildebeest/backend/src/activitypub/objects/image'
import { addFollowing, acceptFollowing } from 'wildebeest/backend/src/mastodon/follow'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from '../utils'
import * as timelines_home from 'wildebeest/functions/api/v1/timelines/home'
import * as timelines_public from 'wildebeest/functions/api/v1/timelines/public'
import * as timelines from 'wildebeest/backend/src/mastodon/timeline'
import { insertLike } from 'wildebeest/backend/src/mastodon/like'
import { insertReblog } from 'wildebeest/backend/src/mastodon/reblog'

const userKEK = 'test_kek6'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Mastodon APIs', () => {
	describe('timelines', () => {
		test('home returns Notes in following Actors', async () => {
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

			// Actor is following actor2, but not actor3.
			await addFollowing(db, actor, actor2, 'not needed')
			await acceptFollowing(db, actor, actor2)

			// Actor 2 is posting
			const firstNoteFromActor2 = await createPublicNote(db, 'first status from actor2', actor2)
			await addObjectInOutbox(db, actor2, firstNoteFromActor2)
			await sleep(10)
			await addObjectInOutbox(db, actor2, await createPublicNote(db, 'second status from actor2', actor2))
			await sleep(10)
			await addObjectInOutbox(db, actor3, await createPublicNote(db, 'first status from actor3', actor3))
			await sleep(10)

			await insertLike(db, actor, firstNoteFromActor2)
			await insertReblog(db, actor, firstNoteFromActor2)

			// Actor should only see posts from actor2 in the timeline
			const connectedActor: any = actor
			const data = await timelines.getHomeTimeline(db, connectedActor)
			assert.equal(data.length, 2)
			assert(data[0].id)
			assert.equal(data[0].content, 'second status from actor2')
			assert.equal(data[0].account.username, 'sven2')
			assert.equal(data[1].content, 'first status from actor2')
			assert.equal(data[1].account.username, 'sven2')
			assert.equal(data[1].favourites_count, 1)
			assert.equal(data[1].reblogs_count, 1)
		})

		test('home returns Notes from ourself', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}

			// Actor is posting
			await addObjectInOutbox(db, actor, await createPublicNote(db, 'status from myself', actor))

			// Actor should only see posts from actor2 in the timeline
			const connectedActor: any = actor
			const data = await timelines.getHomeTimeline(db, connectedActor)
			assert.equal(data.length, 1)
			assert(data[0].id)
			assert.equal(data[0].content, 'status from myself')
			assert.equal(data[0].account.username, 'sven')
		})

		test('home returns cache', async () => {
			const email = 'email@cloudflare.com'
			const kv_cache: any = {
				async get(key: string) {
					assert.equal(key, 'email@cloudflare.com/timeline/home')
					return 'cached data'
				},
			}
			const data = await timelines_home.handleRequest(kv_cache, email)
			assert.equal(await data.text(), 'cached data')
		})

		test('public returns Notes', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}

			const statusFromActor = await createPublicNote(db, 'status from actor', actor)
			await addObjectInOutbox(db, actor, statusFromActor)
			await sleep(10)
			await addObjectInOutbox(db, actor2, await createPublicNote(db, 'status from actor2', actor2))

			await insertLike(db, actor, statusFromActor)
			await insertReblog(db, actor, statusFromActor)

			const res = await timelines_public.handleRequest(db)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<any>()
			assert.equal(data.length, 2)
			assert(data[0].id)
			assert.equal(data[0].content, 'status from actor2')
			assert.equal(data[0].account.username, 'sven2')
			assert.equal(data[1].content, 'status from actor')
			assert.equal(data[1].account.username, 'sven')
			assert.equal(data[1].favourites_count, 1)
			assert.equal(data[1].reblogs_count, 1)

			// if we request only remote objects nothing should be returned
			const remoteRes = await timelines_public.handleRequest(db, { local: false, remote: true, only_media: false })
			assert.equal(remoteRes.status, 200)
			assertJSON(remoteRes)
			assertCORS(remoteRes)
			const remoteData = await remoteRes.json<any>()
			assert.equal(remoteData.length, 0)
		})

		test('public includes attachment', async () => {
			const db = await makeDB()
			const actor: any = { id: await createPerson(db, userKEK, 'sven@cloudflare.com') }

			const properties = { url: 'https://example.com/image.jpg' }
			const mediaAttachments = [await createImage(db, actor, properties)]
			const note = await createPublicNote(db, 'status from actor', actor, mediaAttachments)
			await addObjectInOutbox(db, actor, note)

			const res = await timelines_public.handleRequest(db)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.length, 1)
			assert.equal(data[0].media_attachments.length, 1)
			assert.equal(data[0].media_attachments[0].type, 'image')
			assert.equal(data[0].media_attachments[0].url, properties.url)
		})

		test('public timeline uses published_date', async () => {
			const db = await makeDB()
			const actor: any = { id: await createPerson(db, userKEK, 'sven@cloudflare.com') }

			const note1 = await createPublicNote(db, 'note1', actor)
			const note2 = await createPublicNote(db, 'note2', actor)
			const note3 = await createPublicNote(db, 'note3', actor)
			await addObjectInOutbox(db, actor, note1, '2022-12-10T23:48:38Z')
			await addObjectInOutbox(db, actor, note2, '2000-12-10T23:48:38Z')
			await addObjectInOutbox(db, actor, note3, '2048-12-10T23:48:38Z')

			const res = await timelines_public.handleRequest(db)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data[0].content, 'note3')
			assert.equal(data[1].content, 'note1')
			assert.equal(data[2].content, 'note2')
		})
	})
})
