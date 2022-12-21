import { accessConfig } from 'wildebeest/config/access'
import { getSigningKey } from 'wildebeest/mastodon/account'
import * as oauth_authorize from 'wildebeest/functions/oauth/authorize'
import * as oauth_token from 'wildebeest/functions/oauth/token'
import { isUrlValid, makeDB, assertCORS, assertJSON, assertCache, streamToArrayBuffer } from '../utils'
import { TEST_JWT, ACCESS_CERTS } from '../test-data'
import { strict as assert } from 'node:assert/strict'

const userKEK = 'test_kek3'

describe('Mastodon APIs', () => {
	describe('oauth', () => {
		beforeEach(() => {
			globalThis.fetch = async (input: RequestInfo) => {
				if (input === accessConfig.domain + '/cdn-cgi/access/certs') {
					return new Response(JSON.stringify(ACCESS_CERTS))
				}

				if (input === accessConfig.domain + '/cdn-cgi/access/get-identity') {
					return new Response(
						JSON.stringify({
							email: 'some@cloudflare.com',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}
		})

		test('authorize missing params', async () => {
			const db = await makeDB()

			let req = new Request('https://example.com/oauth/authorize')
			let res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 400)

			req = new Request('https://example.com/oauth/authorize?scope=foobar')
			res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 400)
		})

		test('authorize unsupported response_type', async () => {
			const db = await makeDB()

			const params = new URLSearchParams({
				redirect_uri: 'https://example.com',
				response_type: 'hein',
				client_id: 'client_id',
			})

			const req = new Request('https://example.com/oauth/authorize?' + params)
			const res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 400)
		})

		test('authorize redirects with code on success and creates user', async () => {
			const db = await makeDB()

			const params = new URLSearchParams({
				redirect_uri: 'https://example.com',
				response_type: 'code',
				client_id: 'client_id',
			})

			const headers = {
				'Cf-Access-Jwt-Assertion': TEST_JWT,
			}

			const req = new Request('https://example.com/oauth/authorize?' + params, {
				headers,
			})
			const res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 302)

			const location = res.headers.get('location')
			assert.equal(location, 'https://example.com/?code=' + TEST_JWT)

			const actor = await db.prepare('SELECT * FROM actors').first()
			assert.equal(actor.email, 'some@cloudflare.com')
			assert(isUrlValid(actor.id))
			// ensure that we generate a correct key pairs for the user
			assert((await getSigningKey(userKEK, db, actor)) instanceof CryptoKey)
		})

		test('authorize with redirect_uri urn:ietf:wg:oauth:2.0:oob', async () => {
			const db = await makeDB()

			const params = new URLSearchParams({
				redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
				response_type: 'code',
				client_id: 'client_id',
			})

			const headers = {
				'Cf-Access-Jwt-Assertion': TEST_JWT,
			}

			const req = new Request('https://example.com/oauth/authorize?' + params, {
				headers,
			})
			const res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 200)

			assert.equal(await res.text(), TEST_JWT)
		})

		test('token returns auth infos', async () => {
			const body = {
				code: 'some-code',
			}

			const req = new Request('https://example.com/oauth/token', {
				method: 'POST',
				body: JSON.stringify(body),
			})
			const res = await oauth_token.handleRequest(req)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.access_token, 'some-code')
			assert.equal(data.scope, 'read write follow push')
		})

		test('token handles empty code', async () => {
			const body = {
				code: '',
			}

			const req = new Request('https://example.com/oauth/token', {
				method: 'POST',
				body: JSON.stringify(body),
			})
			const res = await oauth_token.handleRequest(req)
			assert.equal(res.status, 401)
		})

		test('token returns CORS', async () => {
			const req = new Request('https://example.com/oauth/token', {
				method: 'OPTIONS',
			})
			const res = await oauth_token.handleRequest(req)
			assert.equal(res.status, 200)
			assertCORS(res)
		})

		test('authorize returns CORS', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com/oauth/authorize', {
				method: 'OPTIONS',
			})
			const res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 200)
			assertCORS(res)
		})
	})
})
