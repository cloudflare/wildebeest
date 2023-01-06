import { strict as assert } from 'node:assert/strict'
import { configure, generateVAPIDKeys } from 'wildebeest/backend/src/config'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import * as accounts_following from 'wildebeest/functions/api/v1/accounts/[id]/following'
import * as accounts_featured_tags from 'wildebeest/functions/api/v1/accounts/[id]/featured_tags'
import * as accounts_lists from 'wildebeest/functions/api/v1/accounts/[id]/lists'
import * as accounts_relationships from 'wildebeest/functions/api/v1/accounts/relationships'
import * as accounts_followers from 'wildebeest/functions/api/v1/accounts/[id]/followers'
import * as accounts_follow from 'wildebeest/functions/api/v1/accounts/[id]/follow'
import * as accounts_unfollow from 'wildebeest/functions/api/v1/accounts/[id]/unfollow'
import * as accounts_statuses from 'wildebeest/functions/api/v1/accounts/[id]/statuses'
import * as accounts_get from 'wildebeest/functions/api/v1/accounts/[id]'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from '../utils'
import * as accounts_verify_creds from 'wildebeest/functions/api/v1/accounts/verify_credentials'
import * as accounts_update_creds from 'wildebeest/functions/api/v1/accounts/update_credentials'
import { createPerson, getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { addFollowing, acceptFollowing } from 'wildebeest/backend/src/mastodon/follow'
import { insertLike } from 'wildebeest/backend/src/mastodon/like'
import { insertReblog } from 'wildebeest/backend/src/mastodon/reblog'

const userKEK = 'test_kek2'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const domain = 'cloudflare.com'

describe('Mastodon APIs', () => {
	describe('accounts', () => {
		beforeEach(() => {
			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === 'https://remote.com/.well-known/webfinger?resource=acct%3Asven%40remote.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://social.com/sven',
								},
							],
						})
					)
				}

				if (input.toString() === 'https://social.com/sven') {
					return new Response(
						JSON.stringify({
							id: 'sven@remote.com',
							type: 'Person',
							preferredUsername: 'sven',
							name: 'sven ssss',

							icon: { url: 'icon.jpg' },
							image: { url: 'image.jpg' },
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}
		})

		test('missing identity', async () => {
			const data = {
				cloudflareAccess: {
					JWT: {
						getIdentity() {
							return null
						},
					},
				},
			}

			const context: any = { data }
			const res = await accounts_verify_creds.onRequest(context)
			assert.equal(res.status, 401)
		})

		test('verify the credentials', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const connectedActor = actor

			const context: any = { data: { connectedActor }, env: { DATABASE: db } }
			const res = await accounts_verify_creds.onRequest(context)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.display_name, 'sven')
			// Mastodon app expects the id to be a number (as string), it uses
			// it to construct an URL. ActivityPub uses URL as ObjectId so we
			// make sure we don't return the URL.
			assert(!isUrlValid(data.id))
		})

		test('update credentials', async () => {
			const db = await makeDB()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const updates = new FormData()
			updates.set('display_name', 'newsven')
			updates.set('note', 'hein')

			const req = new Request('https://example.com', {
				method: 'PATCH',
				body: updates,
			})
			const res = await accounts_update_creds.handleRequest(
				db,
				req,
				connectedActor,
				'CF_ACCOUNT_ID',
				'CF_API_TOKEN',
				userKEK
			)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.display_name, 'newsven')
			assert.equal(data.note, 'hein')

			const updatedActor: any = await getPersonById(db, connectedActor.id)
			assert(updatedActor)
			assert.equal(updatedActor.name, 'newsven')
			assert.equal(updatedActor.summary, 'hein')
		})

		test('update credentials sends update', async () => {
			const db = await makeDB()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			await addFollowing(db, actor2, connectedActor, 'sven2@' + domain)
			await acceptFollowing(db, actor2, connectedActor)

			let receivedActivity: any = null

			globalThis.fetch = async (input: any) => {
				if (input.url.toString() === `https://${domain}/ap/users/sven2/inbox`) {
					assert.equal(input.method, 'POST')
					receivedActivity = await input.json()
					return new Response('')
				}

				throw new Error('unexpected request to ' + input.url)
			}

			const updates = new FormData()
			updates.set('display_name', 'newsven')

			const req = new Request('https://example.com', {
				method: 'PATCH',
				body: updates,
			})
			const res = await accounts_update_creds.handleRequest(
				db,
				req,
				connectedActor,
				'CF_ACCOUNT_ID',
				'CF_API_TOKEN',
				userKEK
			)
			assert.equal(res.status, 200)

			assert(receivedActivity)
			assert.equal(receivedActivity.type, 'Update')
			assert.equal(receivedActivity.object.id.toString(), connectedActor.id.toString())
			assert.equal(receivedActivity.object.name, 'newsven')
		})

		test('update credentials avatar and header', async () => {
			globalThis.fetch = async (input: RequestInfo, data: any) => {
				if (input === 'https://api.cloudflare.com/client/v4/accounts/CF_ACCOUNT_ID/images/v1') {
					assert.equal(data.method, 'POST')
					const file: any = data.body.get('file')
					return new Response(
						JSON.stringify({
							success: true,
							result: {
								variants: ['https://example.com/' + file.name],
							},
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const updates = new FormData()
			updates.set('avatar', new File(['bytes'], 'selfie.jpg', { type: 'image/jpeg' }))
			updates.set('header', new File(['bytes2'], 'mountain.jpg', { type: 'image/jpeg' }))

			const req = new Request('https://example.com', {
				method: 'PATCH',
				body: updates,
			})
			const res = await accounts_update_creds.handleRequest(
				db,
				req,
				connectedActor,
				'CF_ACCOUNT_ID',
				'CF_API_TOKEN',
				userKEK
			)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.avatar, 'https://example.com/selfie.jpg')
			assert.equal(data.header, 'https://example.com/mountain.jpg')
		})

		test('get remote actor by id', async () => {
			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === 'https://social.com/.well-known/webfinger?resource=acct%3Asven%40social.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://social.com/someone',
								},
							],
						})
					)
				}

				if (input.toString() === 'https://social.com/someone') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/someone',
							url: 'https://social.com/@someone',
							type: 'Person',
							preferredUsername: 'sven',
							outbox: 'https://social.com/someone/outbox',
							following: 'https://social.com/someone/following',
							followers: 'https://social.com/someone/followers',
						})
					)
				}

				if (input.toString() === 'https://social.com/someone/following') {
					return new Response(
						JSON.stringify({
							'@context': 'https://www.w3.org/ns/activitystreams',
							id: 'https://social.com/someone/following',
							type: 'OrderedCollection',
							totalItems: 123,
							first: 'https://social.com/someone/following/page',
						})
					)
				}

				if (input.toString() === 'https://social.com/someone/followers') {
					return new Response(
						JSON.stringify({
							'@context': 'https://www.w3.org/ns/activitystreams',
							id: 'https://social.com/someone/followers',
							type: 'OrderedCollection',
							totalItems: 321,
							first: 'https://social.com/someone/followers/page',
						})
					)
				}

				if (input.toString() === 'https://social.com/someone/outbox') {
					return new Response(
						JSON.stringify({
							'@context': 'https://www.w3.org/ns/activitystreams',
							id: 'https://social.com/someone/outbox',
							type: 'OrderedCollection',
							totalItems: 890,
							first: 'https://social.com/someone/outbox/page',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			const res = await accounts_get.handleRequest(domain, 'sven@social.com', db)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.username, 'sven')
			assert.equal(data.acct, 'sven@social.com')

			assert(isUrlValid(data.url))
			assert(data.url, 'https://social.com/@someone')

			assert.equal(data.followers_count, 321)
			assert.equal(data.following_count, 123)
			assert.equal(data.statuses_count, 890)
		})

		test('get unknown local actor by id', async () => {
			const db = await makeDB()
			const res = await accounts_get.handleRequest(domain, 'sven', db)
			assert.equal(res.status, 404)
		})

		test('get local actor by id', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			const actor3 = await createPerson(domain, db, userKEK, 'sven3@cloudflare.com')
			await addFollowing(db, actor, actor2, 'sven2@' + domain)
			await acceptFollowing(db, actor, actor2)
			await addFollowing(db, actor, actor3, 'sven3@' + domain)
			await acceptFollowing(db, actor, actor3)
			await addFollowing(db, actor3, actor, 'sven@' + domain)
			await acceptFollowing(db, actor3, actor)

			const firstNote = await createPublicNote(domain, db, 'my first status', actor)
			await addObjectInOutbox(db, actor, firstNote)

			const res = await accounts_get.handleRequest(domain, 'sven', db)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.username, 'sven')
			assert.equal(data.acct, 'sven')
			assert.equal(data.followers_count, 1)
			assert.equal(data.following_count, 2)
			assert.equal(data.statuses_count, 1)
			assert(isUrlValid(data.url))
			assert(data.url.includes(domain))
		})

		test('get local actor statuses', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const firstNote = await createPublicNote(domain, db, 'my first status', actor)
			await addObjectInOutbox(db, actor, firstNote)
			await insertLike(db, actor, firstNote)
			await sleep(10)
			const secondNode = await createPublicNote(domain, db, 'my second status', actor)
			await addObjectInOutbox(db, actor, secondNode)
			await insertReblog(db, actor, secondNode)

			const req = new Request('https://' + domain)
			const res = await accounts_statuses.handleRequest(req, db, 'sven@' + domain, userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 2)

			assert.equal(data[0].content, 'my second status')
			assert.equal(data[0].account.acct, 'sven@' + domain)
			assert.equal(data[0].favourites_count, 0)
			assert.equal(data[0].reblogs_count, 1)

			assert.equal(data[1].content, 'my first status')
			assert.equal(data[1].favourites_count, 1)
			assert.equal(data[1].reblogs_count, 0)
		})

		test('get pinned statuses', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const req = new Request('https://' + domain + '?pinned=true')
			const res = await accounts_statuses.handleRequest(req, db, 'sven@' + domain, userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 0)
		})

		test('get local actor statuses with max_id', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			await db
				.prepare("INSERT INTO objects (id, type, properties, local, mastodon_id) VALUES (?, ?, ?, 1, 'mastodon_id')")
				.bind('object1', 'Note', JSON.stringify({ content: 'my first status' }))
				.run()
			await db
				.prepare("INSERT INTO objects (id, type, properties, local, mastodon_id) VALUES (?, ?, ?, 1, 'mastodon_id2')")
				.bind('object2', 'Note', JSON.stringify({ content: 'my second status' }))
				.run()
			await db
				.prepare('INSERT INTO outbox_objects (id, actor_id, object_id, cdate) VALUES (?, ?, ?, ?)')
				.bind('outbox1', actor.id.toString(), 'object1', '2022-12-16 08:14:48')
				.run()
			await db
				.prepare('INSERT INTO outbox_objects (id, actor_id, object_id, cdate) VALUES (?, ?, ?, ?)')
				.bind('outbox2', actor.id.toString(), 'object2', '2022-12-16 10:14:48')
				.run()

			{
				// Query statuses after object1, should only see object2.
				const req = new Request('https://' + domain + '?max_id=object1')
				const res = await accounts_statuses.handleRequest(req, db, 'sven@' + domain, userKEK)
				assert.equal(res.status, 200)

				const data = await res.json<Array<any>>()
				assert.equal(data.length, 1)
				assert.equal(data[0].content, 'my second status')
				assert.equal(data[0].account.acct, 'sven@' + domain)
			}

			{
				// Query statuses after object2, nothing is after.
				const req = new Request('https://' + domain + '?max_id=object2')
				const res = await accounts_statuses.handleRequest(req, db, 'sven@' + domain, userKEK)
				assert.equal(res.status, 200)

				const data = await res.json<Array<any>>()
				assert.equal(data.length, 0)
			}
		})

		test('get remote actor statuses', async () => {
			const db = await makeDB()
			await configure(db, { title: 'title', description: 'a', email: 'email' })
			await generateVAPIDKeys(db)

			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const localNote = await createPublicNote(domain, db, 'my localnote status', actor)

			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === 'https://social.com/.well-known/webfinger?resource=acct%3Asomeone%40social.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://social.com/someone',
								},
							],
						})
					)
				}

				if (input.toString() === 'https://social.com/someone') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/someone',
							type: 'Person',
							preferredUsername: 'someone',
							outbox: 'https://social.com/outbox',
						})
					)
				}

				if (input.toString() === 'https://mastodon.social/users/someone') {
					return new Response(
						JSON.stringify({
							id: 'https://mastodon.social/users/someone',
							type: 'Person',
						})
					)
				}

				if (input.toString() === 'https://social.com/outbox') {
					return new Response(
						JSON.stringify({
							first: 'https://social.com/outbox/page1',
						})
					)
				}

				if (input.toString() === 'https://social.com/outbox/page1') {
					return new Response(
						JSON.stringify({
							orderedItems: [
								{
									id: 'https://mastodon.social/users/a/statuses/b/activity',
									type: 'Create',
									actor: 'https://mastodon.social/users/someone',
									published: '2022-12-10T23:48:38Z',
									object: {
										id: 'https://example.com/object1',
										type: 'Note',
										content: '<p>p</p>',
									},
								},
								{
									id: 'https://mastodon.social/users/c/statuses/d/activity',
									type: 'Announce',
									actor: 'https://mastodon.social/users/someone',
									published: '2022-12-10T23:48:38Z',
									object: localNote.id,
								},
							],
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const req = new Request('https://example.com')
			const res = await accounts_statuses.handleRequest(req, db, 'someone@social.com', userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 1)
			assert.equal(data[0].content, '<p>p</p>')
			assert.equal(data[0].account.username, 'someone')

			// Statuses were imported locally and once was a reblog of an already
			// existing local object.
			const row = await db.prepare(`SELECT count(*) as count FROM objects`).first()
			assert.equal(row.count, 2)
		})

		test('get remote actor statuses ignoring object that fail to download', async () => {
			const db = await makeDB()
			await generateVAPIDKeys(db)

			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const localNote = await createPublicNote(domain, db, 'my localnote status', actor)

			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === 'https://social.com/.well-known/webfinger?resource=acct%3Asomeone%40social.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://social.com/someone',
								},
							],
						})
					)
				}

				if (input.toString() === 'https://social.com/someone') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/someone',
							type: 'Person',
							preferredUsername: 'someone',
							outbox: 'https://social.com/outbox',
						})
					)
				}

				if (input.toString() === 'https://social.com/outbox') {
					return new Response(
						JSON.stringify({
							first: 'https://social.com/outbox/page1',
						})
					)
				}

				if (input.toString() === 'https://nonexistingobject.com/') {
					return new Response('', { status: 400 })
				}

				if (input.toString() === 'https://social.com/outbox/page1') {
					return new Response(
						JSON.stringify({
							orderedItems: [
								{
									id: 'https://mastodon.social/users/c/statuses/d/activity',
									type: 'Announce',
									actor: 'https://mastodon.social/users/someone',
									published: '2022-12-10T23:48:38Z',
									object: 'https://nonexistingobject.com',
								},
							],
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const req = new Request('https://example.com')
			const res = await accounts_statuses.handleRequest(req, db, 'someone@social.com', userKEK)
			assert.equal(res.status, 200)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 0)
		})

		test('get remote actor followers', async () => {
			const db = await makeDB()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const req = new Request(`https://${domain}`)
			const res = await accounts_followers.handleRequest(req, db, 'sven@example.com', connectedActor)
			assert.equal(res.status, 403)
		})

		test('get local actor followers', async () => {
			globalThis.fetch = async (input: any, opts: any) => {
				if (input.toString() === 'https://' + domain + '/ap/users/sven2') {
					return new Response(
						JSON.stringify({
							id: 'https://example.com/actor',
							type: 'Person',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			await addFollowing(db, actor2, actor, 'sven@' + domain)
			await acceptFollowing(db, actor2, actor)

			const connectedActor = actor
			const req = new Request(`https://${domain}`)
			const res = await accounts_followers.handleRequest(req, db, 'sven', connectedActor)
			assert.equal(res.status, 200)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 1)
		})

		test('get local actor following', async () => {
			globalThis.fetch = async (input: any, opts: any) => {
				if (input.toString() === 'https://' + domain + '/ap/users/sven2') {
					return new Response(
						JSON.stringify({
							id: 'https://example.com/foo',
							type: 'Person',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
			await addFollowing(db, actor, actor2, 'sven@' + domain)
			await acceptFollowing(db, actor, actor2)

			const connectedActor = actor
			const req = new Request(`https://${domain}`)
			const res = await accounts_following.handleRequest(req, db, 'sven', connectedActor)
			assert.equal(res.status, 200)

			const data = await res.json<Array<any>>()
			assert.equal(data.length, 1)
		})

		test('get remote actor following', async () => {
			const db = await makeDB()

			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const req = new Request(`https://${domain}`)
			const res = await accounts_following.handleRequest(req, db, 'sven@example.com', connectedActor)
			assert.equal(res.status, 403)
		})

		test('get remote actor featured_tags', async () => {
			const res = await accounts_featured_tags.onRequest()
			assert.equal(res.status, 200)
		})

		test('get remote actor lists', async () => {
			const res = await accounts_lists.onRequest()
			assert.equal(res.status, 200)
		})

		describe('relationships', () => {
			test('relationships missing ids', async () => {
				const db = await makeDB()
				const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const req = new Request('https://mastodon.example/api/v1/accounts/relationships')
				const res = await accounts_relationships.handleRequest(req, db, connectedActor)
				assert.equal(res.status, 400)
			})

			test('relationships with ids', async () => {
				const db = await makeDB()
				const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=first&id[]=second')
				const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const res = await accounts_relationships.handleRequest(req, db, connectedActor)
				assert.equal(res.status, 200)
				assertCORS(res)
				assertJSON(res)

				const data = await res.json<Array<any>>()
				assert.equal(data.length, 2)
				assert.equal(data[0].id, 'first')
				assert.equal(data[0].following, false)
				assert.equal(data[1].id, 'second')
				assert.equal(data[1].following, false)
			})

			test('relationships with one id', async () => {
				const db = await makeDB()
				const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=first')
				const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const res = await accounts_relationships.handleRequest(req, db, connectedActor)
				assert.equal(res.status, 200)
				assertCORS(res)
				assertJSON(res)

				const data = await res.json<Array<any>>()
				assert.equal(data.length, 1)
				assert.equal(data[0].id, 'first')
				assert.equal(data[0].following, false)
			})

			test('relationships following', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
				await addFollowing(db, actor, actor2, 'sven2@' + domain)
				await acceptFollowing(db, actor, actor2)

				const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=sven2@' + domain)
				const res = await accounts_relationships.handleRequest(req, db, actor)
				assert.equal(res.status, 200)

				const data = await res.json<Array<any>>()
				assert.equal(data.length, 1)
				assert.equal(data[0].following, true)
			})

			test('relationships following request', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const actor2 = await createPerson(domain, db, userKEK, 'sven2@cloudflare.com')
				await addFollowing(db, actor, actor2, 'sven2@' + domain)

				const req = new Request('https://mastodon.example/api/v1/accounts/relationships?id[]=sven2@' + domain)
				const res = await accounts_relationships.handleRequest(req, db, actor)
				assert.equal(res.status, 200)

				const data = await res.json<Array<any>>()
				assert.equal(data.length, 1)
				assert.equal(data[0].requested, true)
				assert.equal(data[0].following, false)
			})
		})

		test('follow local account', async () => {
			const db = await makeDB()

			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const req = new Request('https://example.com', { method: 'POST' })
			const res = await accounts_follow.handleRequest(req, db, 'localuser', connectedActor, userKEK)
			assert.equal(res.status, 403)
		})

		describe('follow', () => {
			let receivedActivity: any = null

			beforeEach(() => {
				receivedActivity = null

				globalThis.fetch = async (input: any, opts: any) => {
					if (
						input.toString() ===
						'https://' + domain + '/.well-known/webfinger?resource=acct%3Aactor%40' + domain + ''
					) {
						return new Response(
							JSON.stringify({
								links: [
									{
										rel: 'self',
										type: 'application/activity+json',
										href: 'https://social.com/sven',
									},
								],
							})
						)
					}

					if (input.toString() === 'https://social.com/sven') {
						return new Response(
							JSON.stringify({
								id: `https://${domain}/ap/users/actor`,
								type: 'Person',
								inbox: 'https://example.com/inbox',
							})
						)
					}

					if (input.url === 'https://example.com/inbox') {
						assert.equal(input.method, 'POST')
						receivedActivity = await input.json()
						return new Response('')
					}

					throw new Error('unexpected request to ' + input)
				}
			})

			test('follow account', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

				const connectedActor = actor

				const req = new Request('https://example.com', { method: 'POST' })
				const res = await accounts_follow.handleRequest(req, db, 'actor@' + domain, connectedActor, userKEK)
				assert.equal(res.status, 200)
				assertCORS(res)
				assertJSON(res)

				assert(receivedActivity)
				assert.equal(receivedActivity.type, 'Follow')

				const row = await db
					.prepare(`SELECT target_actor_acct, target_actor_id, state FROM actor_following WHERE actor_id=?`)
					.bind(actor.id.toString())
					.first()
				assert(row)
				assert.equal(row.target_actor_acct, 'actor@' + domain)
				assert.equal(row.target_actor_id, `https://${domain}/ap/users/actor`)
				assert.equal(row.state, 'pending')
			})

			test('unfollow account', async () => {
				const db = await makeDB()
				const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				const follower = await createPerson(domain, db, userKEK, 'actor@cloudflare.com')
				await addFollowing(db, actor, follower, 'not needed')

				const connectedActor = actor

				const req = new Request('https://example.com', { method: 'POST' })
				const res = await accounts_unfollow.handleRequest(req, db, 'actor@' + domain, connectedActor, userKEK)
				assert.equal(res.status, 200)
				assertCORS(res)
				assertJSON(res)

				assert(receivedActivity)
				assert.equal(receivedActivity.type, 'Undo')
				assert.equal(receivedActivity.object.type, 'Follow')

				const row = await db
					.prepare(`SELECT count(*) as count FROM actor_following WHERE actor_id=?`)
					.bind(actor.id.toString())
					.first()
				assert(row)
				assert.equal(row.count, 0)
			})
		})
	})
})
