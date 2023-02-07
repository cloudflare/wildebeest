import * as activityHandler from 'wildebeest/backend/src/activitypub/activities/handle'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import * as ap_followers_page from 'wildebeest/functions/ap/users/[id]/followers/page'
import * as ap_following_page from 'wildebeest/functions/ap/users/[id]/following/page'
import * as ap_followers from 'wildebeest/functions/ap/users/[id]/followers'
import * as ap_following from 'wildebeest/functions/ap/users/[id]/following'
import { addFollowing, acceptFollowing } from 'wildebeest/backend/src/mastodon/follow'
import { strict as assert } from 'node:assert/strict'
import { makeDB } from '../utils'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'

const userKEK = 'test_kek10'
const domain = 'cloudflare.com'
const adminEmail = 'admin@example.com'
const vapidKeys = {} as JWK

describe('ActivityPub', () => {
	describe('Follow', () => {
		let receivedActivity: any = null

		beforeEach(() => {
			receivedActivity = null

			globalThis.fetch = async (input: RequestInfo) => {
				const request = new Request(input)
				if (request.url === `https://${domain}/ap/users/sven2/inbox`) {
					assert.equal(request.method, 'POST')
					const data = await request.json()
					receivedActivity = data
					return new Response('')
				}

				throw new Error('unexpected request to ' + request.url)
			}
		})

		test('Receive follow with Accept reply', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')

			const activity = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Follow',
				actor: actor2.id.toString(),
				object: actor.id.toString(),
			}

			await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

			const row = await db
				.prepare(`SELECT target_actor_id, state FROM actor_following WHERE actor_id=?`)
				.bind(actor2.id.toString())
				.first<{
					target_actor_id: object
					state: string
				}>()
			assert(row)
			assert.equal(row.target_actor_id.toString(), actor.id.toString())
			assert.equal(row.state, 'accepted')

			assert(receivedActivity)
			assert.equal(receivedActivity.type, 'Accept')
			assert.equal((receivedActivity.actor as object).toString(), actor.id.toString())
			assert.equal(receivedActivity.object.actor, activity.actor)
			assert.equal(receivedActivity.object.type, activity.type)
		})

		test('list actor following', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			const actor3 = await createPerson(domain, db, userKEK, 'sven3@cloudflare.com')
			await addFollowing(db, actor, actor2, 'not needed')
			await acceptFollowing(db, actor, actor2)
			await addFollowing(db, actor, actor3, 'not needed')
			await acceptFollowing(db, actor, actor3)

			const res = await ap_following.handleRequest(domain, db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollection')
			assert.equal(data.totalItems, 2)
		})

		test('list actor following page', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			const actor3 = await createPerson(domain, db, userKEK, 'sven3@cloudflare.com')
			await addFollowing(db, actor, actor2, 'not needed')
			await acceptFollowing(db, actor, actor2)
			await addFollowing(db, actor, actor3, 'not needed')
			await acceptFollowing(db, actor, actor3)

			const res = await ap_following_page.handleRequest(domain, db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollectionPage')
			assert.equal(data.orderedItems[0], `https://${domain}/ap/users/sven2`)
			assert.equal(data.orderedItems[1], `https://${domain}/ap/users/sven3`)
		})

		test('list actor follower', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			await addFollowing(db, actor2, actor, 'not needed')
			await acceptFollowing(db, actor2, actor)

			const res = await ap_followers.handleRequest(domain, db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollection')
			assert.equal(data.totalItems, 1)
		})

		test('list actor follower page', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			await addFollowing(db, actor2, actor, 'not needed')
			await acceptFollowing(db, actor2, actor)

			const res = await ap_followers_page.handleRequest(domain, db, 'sven')
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.type, 'OrderedCollectionPage')
			assert.equal(data.orderedItems[0], `https://${domain}/ap/users/sven2`)
		})

		test('creates a notification', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')

			const activity = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Follow',
				actor: actor2.id,
				object: actor.id,
			}

			await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

			const entry = await db.prepare('SELECT * FROM actor_notifications').first<{
				type: string
				actor_id: object
				from_actor_id: object
			}>()
			assert.equal(entry.type, 'follow')
			assert.equal(entry.actor_id.toString(), actor.id.toString())
			assert.equal(entry.from_actor_id.toString(), actor2.id.toString())
		})

		test('ignore when trying to follow multiple times', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')

			const activity = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Follow',
				actor: actor2.id,
				object: actor.id,
			}

			await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)
			await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)
			await activityHandler.handle(domain, activity, db, userKEK, adminEmail, vapidKeys)

			// Even if we followed multiple times, only one row should be present.
			const { count } = await db.prepare(`SELECT count(*) as count FROM actor_following`).first<{ count: number }>()
			assert.equal(count, 1)
		})
	})
})
