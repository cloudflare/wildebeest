import { strict as assert } from 'node:assert/strict'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as v1_instance from 'wildebeest/functions/api/v1/instance'
import * as v2_instance from 'wildebeest/functions/api/v2/instance'
import * as custom_emojis from 'wildebeest/functions/api/v1/custom_emojis'
import * as mutes from 'wildebeest/functions/api/v1/mutes'
import * as blocks from 'wildebeest/functions/api/v1/blocks'
import { makeDB, assertCORS, assertJSON, assertCache } from './utils'
import { enrichStatus } from 'wildebeest/backend/src/mastodon/microformats'
import { moveFollowers } from 'wildebeest/backend/src/mastodon/follow'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'

const userKEK = 'test_kek23'
const domain = 'cloudflare.com'

describe('Mastodon APIs', () => {
	describe('instance', () => {
		type Data = {
			rules: unknown[]
			uri: string
			title: string
			email: string
			description: string
			version: string
			domain: string
			contact: { email: string }
		}

		test('return the instance infos v1', async () => {
			const env = {
				INSTANCE_TITLE: 'a',
				ADMIN_EMAIL: 'b',
				INSTANCE_DESCR: 'c',
			} as Env

			const res = await v1_instance.handleRequest(domain, env)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			{
				const data = await res.json<Data>()
				assert.equal(data.rules.length, 0)
				assert.equal(data.uri, domain)
				assert.equal(data.title, 'a')
				assert.equal(data.email, 'b')
				assert.equal(data.description, 'c')
				assert(data.version.includes('Wildebeest'))
			}
		})

		test('adds a short_description if missing v1', async () => {
			const env = {
				INSTANCE_DESCR: 'c',
			} as Env

			const res = await v1_instance.handleRequest(domain, env)
			assert.equal(res.status, 200)

			{
				const data = await res.json<any>()
				assert.equal(data.short_description, 'c')
			}
		})

		test('return the instance infos v2', async () => {
			const db = await makeDB()

			const env = {
				INSTANCE_TITLE: 'a',
				ADMIN_EMAIL: 'b',
				INSTANCE_DESCR: 'c',
			} as Env
			const res = await v2_instance.handleRequest(domain, db, env)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			{
				const data = await res.json<Data>()
				assert.equal(data.rules.length, 0)
				assert.equal(data.domain, domain)
				assert.equal(data.title, 'a')
				assert.equal(data.contact.email, 'b')
				assert.equal(data.description, 'c')
				assert(data.version.includes('Wildebeest'))
			}
		})
	})

	describe('custom emojis', () => {
		test('returns an empty array', async () => {
			const res = await custom_emojis.onRequest()
			assert.equal(res.status, 200)
			assertJSON(res)
			assertCORS(res)
			assertCache(res, 300)

			const data = await res.json<any>()
			assert.equal(data.length, 0)
		})
	})

	test('mutes returns an empty array', async () => {
		const res = await mutes.onRequest()
		assert.equal(res.status, 200)
		assertJSON(res)

		const data = await res.json<any>()
		assert.equal(data.length, 0)
	})

	test('blocks returns an empty array', async () => {
		const res = await blocks.onRequest()
		assert.equal(res.status, 200)
		assertJSON(res)

		const data = await res.json<any>()
		assert.equal(data.length, 0)
	})

	describe('Microformats', () => {
		test('convert mentions to HTML', async () => {
			const mentionsToTest = [
				{
					mention: '@sven2@example.com',
					expectedMentionSpan:
						'<span class="h-card"><a href="https://example.com/@sven2" class="u-url mention">@<span>sven2</span></a></span>',
				},
				{
					mention: '@test@example.eng.com',
					expectedMentionSpan:
						'<span class="h-card"><a href="https://example.eng.com/@test" class="u-url mention">@<span>test</span></a></span>',
				},
				{
					mention: '@test.a.b.c-d@example.eng.co.uk',
					expectedMentionSpan:
						'<span class="h-card"><a href="https://example.eng.co.uk/@test.a.b.c-d" class="u-url mention">@<span>test.a.b.c-d</span></a></span>',
				},
				{
					mention: '@testey@123456.abcdef',
					expectedMentionSpan:
						'<span class="h-card"><a href="https://123456.abcdef/@testey" class="u-url mention">@<span>testey</span></a></span>',
				},
				{
					mention: '@testey@123456.test.testey.abcdef',
					expectedMentionSpan:
						'<span class="h-card"><a href="https://123456.test.testey.abcdef/@testey" class="u-url mention">@<span>testey</span></a></span>',
				},
			]

			for (let i = 0, len = mentionsToTest.length; i < len; i++) {
				const { mention, expectedMentionSpan } = mentionsToTest[i]

				// List of mentioned actors, only the `id` is required so we can hack together an Actor
				const mentions: any = [
					{ id: new URL('https://example.com/sven2') },
					{ id: new URL('https://example.eng.com/test') },
					{ id: new URL('https://example.eng.co.uk/test.a.b.c-d') },
					{ id: new URL('https://123456.abcdef/testey') },
					{ id: new URL('https://123456.test.testey.abcdef/testey') },
				]

				assert.equal(enrichStatus(`hey ${mention} hi`, mentions), `<p>hey ${expectedMentionSpan} hi</p>`)
				assert.equal(enrichStatus(`${mention} hi`, mentions), `<p>${expectedMentionSpan} hi</p>`)
				assert.equal(enrichStatus(`${mention}\n\thein`, mentions), `<p>${expectedMentionSpan}\n\thein</p>`)
				assert.equal(enrichStatus(`hey ${mention}`, mentions), `<p>hey ${expectedMentionSpan}</p>`)
				assert.equal(enrichStatus(`${mention}`, mentions), `<p>${expectedMentionSpan}</p>`)
				assert.equal(enrichStatus(`@!@£${mention}!!!`, mentions), `<p>@!@£${expectedMentionSpan}!!!</p>`)
			}
		})

		test('handle invalid mention', () => {
			assert.equal(enrichStatus('hey @#-...@example.com', []), '<p>hey @#-...@example.com</p>')
		})

		test('mention to invalid user', () => {
			assert.equal(enrichStatus('hey test@example.com', []), '<p>hey test@example.com</p>')
		})

		test('convert links to HTML', () => {
			const linksToTest = [
				'https://cloudflare.com/abc',
				'https://cloudflare.com/abc/def',
				'https://www.cloudflare.com/123',
				'http://www.cloudflare.co.uk',
				'http://www.cloudflare.co.uk?test=test@123',
				'http://www.cloudflare.com/.com/?test=test@~123&a=b',
				'https://developers.cloudflare.com/workers/runtime-apis/request/#background',
				'https://a.test',
				'https://a.test/test',
				'https://a.test/test?test=test',
			]
			linksToTest.forEach((link) => {
				const url = new URL(link)
				const urlDisplayText = `${url.hostname}${url.pathname}`
				assert.equal(enrichStatus(`hey ${link} hi`, []), `<p>hey <a href="${link}">${urlDisplayText}</a> hi</p>`)
				assert.equal(enrichStatus(`${link} hi`, []), `<p><a href="${link}">${urlDisplayText}</a> hi</p>`)
				assert.equal(enrichStatus(`hey ${link}`, []), `<p>hey <a href="${link}">${urlDisplayText}</a></p>`)
				assert.equal(enrichStatus(`${link}`, []), `<p><a href="${link}">${urlDisplayText}</a></p>`)
				assert.equal(enrichStatus(`@!@£${link}!!!`, []), `<p>@!@£<a href="${link}">${urlDisplayText}</a>!!!</p>`)
			})
		})

		test('convert tags to HTML', async () => {
			const tagsToTest = [
				{
					tag: '#test',
					expectedTagAnchor: '<a href="/tags/test" class="status-link hashtag">#test</a>',
				},
				{
					tag: '#123_joke_123',
					expectedTagAnchor: '<a href="/tags/123_joke_123" class="status-link hashtag">#123_joke_123</a>',
				},
				{
					tag: '#_123',
					expectedTagAnchor: '<a href="/tags/_123" class="status-link hashtag">#_123</a>',
				},
				{
					tag: '#example:',
					expectedTagAnchor: '<a href="/tags/example" class="status-link hashtag">#example</a>:',
				},
				{
					tag: '#tagA#tagB',
					expectedTagAnchor:
						'<a href="/tags/tagA" class="status-link hashtag">#tagA</a><a href="/tags/tagB" class="status-link hashtag">#tagB</a>',
				},
			]

			for (let i = 0, len = tagsToTest.length; i < len; i++) {
				const { tag, expectedTagAnchor } = tagsToTest[i]

				assert.equal(enrichStatus(`hey ${tag} hi`, []), `<p>hey ${expectedTagAnchor} hi</p>`)
				assert.equal(enrichStatus(`${tag} hi`, []), `<p>${expectedTagAnchor} hi</p>`)
				assert.equal(enrichStatus(`${tag}\n\thein`, []), `<p>${expectedTagAnchor}\n\thein</p>`)
				assert.equal(enrichStatus(`hey ${tag}`, []), `<p>hey ${expectedTagAnchor}</p>`)
				assert.equal(enrichStatus(`${tag}`, []), `<p>${expectedTagAnchor}</p>`)
				assert.equal(enrichStatus(`@!@£${tag}!!!`, []), `<p>@!@£${expectedTagAnchor}!!!</p>`)
			}
		})

		test('ignore invalid tags', () => {
			assert.equal(enrichStatus('tags cannot be empty like: #', []), `<p>tags cannot be empty like: #</p>`)
			assert.equal(
				enrichStatus('tags cannot contain only numbers like: #123', []),
				`<p>tags cannot contain only numbers like: #123</p>`
			)
		})
	})

	describe('Follow', () => {
		test('move followers', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			globalThis.fetch = async (input: RequestInfo) => {
				if (input === 'https://example.com/user/a') {
					return new Response(JSON.stringify({ id: 'https://example.com/user/a', type: 'Actor' }))
				}
				if (input === 'https://example.com/user/b') {
					return new Response(JSON.stringify({ id: 'https://example.com/user/b', type: 'Actor' }))
				}
				if (input === 'https://example.com/user/c') {
					return new Response(JSON.stringify({ id: 'https://example.com/user/c', type: 'Actor' }))
				}

				throw new Error(`unexpected request to "${input}"`)
			}

			const followers = ['https://example.com/user/a', 'https://example.com/user/b', 'https://example.com/user/c']

			await moveFollowers(db, actor, followers)

			const { results, success } = await db.prepare('SELECT * FROM actor_following').all<any>()
			assert(success)
			assert(results)
			assert.equal(results.length, 3)
			assert.equal(results[0].state, 'accepted')
			assert.equal(results[0].actor_id, 'https://example.com/user/a')
			assert.equal(results[0].target_actor_acct, 'sven@cloudflare.com')
			assert.equal(results[1].state, 'accepted')
			assert.equal(results[1].actor_id, 'https://example.com/user/b')
			assert.equal(results[1].target_actor_acct, 'sven@cloudflare.com')
			assert.equal(results[2].state, 'accepted')
			assert.equal(results[2].actor_id, 'https://example.com/user/c')
			assert.equal(results[2].target_actor_acct, 'sven@cloudflare.com')
		})
	})
})
