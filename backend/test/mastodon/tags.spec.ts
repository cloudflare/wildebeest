import { strict as assert } from 'node:assert/strict'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { makeDB, assertCORS, isUrlValid } from '../utils'
import * as tag_id from 'wildebeest/functions/api/v1/tags/[tag]'
import { insertHashtags } from 'wildebeest/backend/src/mastodon/hashtag'

const domain = 'cloudflare.com'
const userKEK = 'test_kek20'

describe('Mastodon APIs', () => {
	describe('tags', () => {
		test('return 404 when non existent tag', async () => {
			const db = await makeDB()
			const res = await tag_id.handleRequestGet(db, domain, 'non-existent-tag')
			assertCORS(res)
			assert.equal(res.status, 404)
		})

		test('return tag', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const note = await createPublicNote(domain, db, 'my localnote status', actor)
			await insertHashtags(db, note, ['test'])

			const res = await tag_id.handleRequestGet(db, domain, 'test')
			assertCORS(res)
			assert.equal(res.status, 200)

			const data = await res.json<any>()
			assert.equal(data.name, 'test')
			assert(isUrlValid(data.url))
		})
	})
})
