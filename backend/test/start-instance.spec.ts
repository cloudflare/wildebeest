import * as startInstance from 'wildebeest/functions/start-instance'
import { TEST_JWT, ACCESS_CERTS } from './test-data'
import { strict as assert } from 'node:assert/strict'
import { makeDB } from './utils'

const accessDomain = 'access.com'
const accessAud = 'abcd'

describe('Wildebeest', () => {
	globalThis.fetch = async (input: RequestInfo) => {
		if (input === 'https://' + accessDomain + '/cdn-cgi/access/certs') {
			return new Response(JSON.stringify(ACCESS_CERTS))
		}
		if (input === 'https://' + accessDomain + '/cdn-cgi/access/get-identity') {
			return new Response(
				JSON.stringify({
					email: 'some@cloudflare.com',
				})
			)
		}
		throw new Error('unexpected request to ' + input)
	}

	test('start instance should generate a VAPID key and store a JWK', async () => {
		const db = await makeDB()

		const body = JSON.stringify({
			title: 'title',
			description: 'description',
			email: 'email',
			accessDomain,
			accessAud,
		})

		const headers = {
			cookie: 'CF_Authorization=' + TEST_JWT,
		}

		const req = new Request('https://example.com', { method: 'POST', body, headers })
		const res = await startInstance.handlePostRequest(req, db)
		assert.equal(res.status, 201)

		const { value } = await db.prepare("SELECT value FROM instance_config WHERE key = 'vapid_jwk'").first()
		const jwk = JSON.parse(value)

		assert.equal(jwk.key_ops.length, 1)
		assert.equal(jwk.key_ops[0], 'sign')
		assert.equal(jwk.crv, 'P-256')
	})
})
