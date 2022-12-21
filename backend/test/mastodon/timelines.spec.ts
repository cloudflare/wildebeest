import { strict as assert } from 'node:assert/strict'
import { addFollowing, acceptFollowing } from 'wildebeest/backend/src/activitypub/actors/follow'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from '../utils'
import * as timelines_home from 'wildebeest/functions/api/v1/timelines/home'
import * as timelines_public from 'wildebeest/functions/api/v1/timelines/public'

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
			await addObjectInOutbox(db, actor2, await createPublicNote(db, 'first status from actor2', actor2))
			await sleep(10)
			await addObjectInOutbox(db, actor2, await createPublicNote(db, 'second status from actor2', actor2))
			await sleep(10)
			await addObjectInOutbox(db, actor3, await createPublicNote(db, 'first status from actor3', actor3))
			await sleep(10)

			// Actor should only see posts from actor2 in the timeline
			const connectedActor: any = actor
			const res = await timelines_home.handleRequest(db, connectedActor)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<any>()
			assert.equal(data.length, 2)
			assert.equal(data[0].content, 'second status from actor2')
			assert.equal(data[0].account.username, 'sven2')
			assert.equal(data[1].content, 'first status from actor2')
			assert.equal(data[1].account.username, 'sven2')
		})

		test('public returns Notes', async () => {
			const db = await makeDB()
			const actor: any = {
				id: await createPerson(db, userKEK, 'sven@cloudflare.com'),
			}
			const actor2: any = {
				id: await createPerson(db, userKEK, 'sven2@cloudflare.com'),
			}

			await addObjectInOutbox(db, actor, await createPublicNote(db, 'status from actor', actor))
			await sleep(10)
			await addObjectInOutbox(db, actor2, await createPublicNote(db, 'status from actor2', actor2))

			const res = await timelines_public.handleRequest(db)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<any>()
			assert.equal(data.length, 2)
			assert.equal(data[0].content, 'status from actor2')
			assert.equal(data[0].account.username, 'sven2')
			assert.equal(data[1].content, 'status from actor')
			assert.equal(data[1].account.username, 'sven')
		})
	})
})
