import { strict as assert } from 'node:assert/strict'
import * as trends_statuses from 'wildebeest/functions/api/v1/trends/statuses'
import * as trends_links from 'wildebeest/functions/api/v1/trends/links'
import { assertJSON } from '../utils'

describe('Mastodon APIs', () => {
	describe('trends', () => {
		test('trending statuses return empty array', async () => {
			const res = await trends_statuses.onRequest()
			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.length, 0)
		})

		test('trending links return empty array', async () => {
			const res = await trends_links.onRequest()
			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.length, 0)
		})
	})
})
