import * as search from 'wildebeest/functions/api/v2/search'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { defaultImages } from 'wildebeest/config/accounts'
import { makeDB, assertCORS, assertJSON } from '../utils'
import { strict as assert } from 'node:assert/strict'

const userKEK = 'test_kek11'
const domain = 'cloudflare.com'

describe('Mastodon APIs', () => {
	describe('search', () => {
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

				if (
					input.toString() ===
					'https://remote.com/.well-known/webfinger?resource=acct%3Adefault-avatar-and-header%40remote.com'
				) {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://social.com/default-avatar-and-header',
								},
							],
						})
					)
				}

				if (input.toString() === 'https://social.com/sven') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/sven',
							type: 'Person',
							preferredUsername: 'sven',
							name: 'sven ssss',

							icon: { url: 'icon.jpg' },
							image: { url: 'image.jpg' },
						})
					)
				}

				if (input.toString() === 'https://social.com/default-avatar-and-header') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/default-avatar-and-header',
							type: 'Person',
							preferredUsername: 'sven',
							name: 'sven ssss',
						})
					)
				}

				throw new Error(`unexpected request to "${input}"`)
			}
		})

		test('no query returns an error', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com/api/v2/search')
			const res = await search.handleRequest(db, req)
			assert.equal(res.status, 400)
		})

		test('empty results', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com/api/v2/search?q=non-existing-local-user')
			const res = await search.handleRequest(db, req)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<any>()
			assert.equal(data.accounts.length, 0)
			assert.equal(data.statuses.length, 0)
			assert.equal(data.hashtags.length, 0)
		})

		test('queries WebFinger when remote account', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com/api/v2/search?q=@sven@remote.com&resolve=true')
			const res = await search.handleRequest(db, req)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<any>()
			assert.equal(data.accounts.length, 1)
			assert.equal(data.statuses.length, 0)
			assert.equal(data.hashtags.length, 0)

			const account = data.accounts[0]
			assert.equal(account.id, 'sven@remote.com')
			assert.equal(account.username, 'sven')
			assert.equal(account.acct, 'sven@remote.com')
		})

		test('queries WebFinger when remote account with default avatar / header', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com/api/v2/search?q=@default-avatar-and-header@remote.com&resolve=true')
			const res = await search.handleRequest(db, req)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)

			const data = await res.json<any>()
			assert.equal(data.accounts.length, 1)
			assert.equal(data.statuses.length, 0)
			assert.equal(data.hashtags.length, 0)

			const account = data.accounts[0]
			assert.equal(account.avatar, defaultImages.avatar)
			assert.equal(account.header, defaultImages.header)
		})

		test("don't queries WebFinger when resolve is set to false", async () => {
			const db = await makeDB()
			globalThis.fetch = () => {
				throw new Error('unreachable')
			}

			const req = new Request('https://example.com/api/v2/search?q=@sven@remote.com&resolve=false')
			const res = await search.handleRequest(db, req)
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)
		})

		test('search local actors', async () => {
			const db = await makeDB()
			await createPerson(domain, db, userKEK, 'username@cloudflare.com', { name: 'foo' })
			await createPerson(domain, db, userKEK, 'username2@cloudflare.com', { name: 'bar' })

			{
				const req = new Request('https://example.com/api/v2/search?q=foo&resolve=false')
				const res = await search.handleRequest(db, req)
				assert.equal(res.status, 200)

				const data = await res.json<any>()
				assert.equal(data.accounts.length, 1)
				assert.equal(data.accounts[0].display_name, 'foo')
			}

			{
				const req = new Request('https://example.com/api/v2/search?q=user&resolve=false')
				const res = await search.handleRequest(db, req)
				assert.equal(res.status, 200)

				const data = await res.json<any>()
				assert.equal(data.accounts.length, 2)
				assert.equal(data.accounts[0].display_name, 'foo')
				assert.equal(data.accounts[1].display_name, 'bar')
			}
		})

		test('empty results for invalid handle', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com/api/v2/search?q=    ')
			const res = await search.handleRequest(db, req)
			assert.equal(res.status, 400)
		})
	})
})
