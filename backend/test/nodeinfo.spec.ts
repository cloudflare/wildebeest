import { strict as assert } from 'node:assert/strict'
import * as nodeinfo_21 from 'wildebeest/functions/nodeinfo/2.1'
import * as nodeinfo_20 from 'wildebeest/functions/nodeinfo/2.0'
import * as nodeinfo from 'wildebeest/functions/.well-known/nodeinfo'
import { assertCORS } from './utils'

const domain = 'example.com'

describe('NodeInfo', () => {
	test('well-known returns links', async () => {
		const res = await nodeinfo.handleRequest(domain)
		assert.equal(res.status, 200)
		assertCORS(res)

		const data = await res.json<any>()
		assert.equal(data.links.length, 2)
	})

	test('expose NodeInfo version 2.0', async () => {
		const res = await nodeinfo_20.handleRequest()
		assert.equal(res.status, 200)
		assertCORS(res)

		const data = await res.json<any>()
		assert.equal(data.version, '2.0')
	})

	test('expose NodeInfo version 2.1', async () => {
		const res = await nodeinfo_21.handleRequest()
		assert.equal(res.status, 200)
		assertCORS(res)

		const data = await res.json<any>()
		assert.equal(data.version, '2.1')
	})
})
