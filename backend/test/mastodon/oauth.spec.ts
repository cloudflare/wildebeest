import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import * as oauth_authorize from 'wildebeest/functions/oauth/authorize'
import * as first_login from 'wildebeest/functions/first-login'
import * as oauth_token from 'wildebeest/functions/oauth/token'
import {
	isUrlValid,
	makeDB,
	assertCORS,
	assertJSON,
	assertCache,
	streamToArrayBuffer,
	createTestClient,
} from '../utils'
import { TEST_JWT, ACCESS_CERTS } from '../test-data'
import { strict as assert } from 'node:assert/strict'
import { configureAccess } from 'wildebeest/backend/src/config/index'

const userKEK = 'test_kek3'
const accessDomain = 'access.com'
const accessAud = 'abcd'

describe('Mastodon APIs', () => {
	describe('oauth', () => {
		beforeEach(() => {
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
		})

		test('authorize missing params', async () => {
			const db = await makeDB()
			await configureAccess(db, accessDomain, accessAud)

			let req = new Request('https://example.com/oauth/authorize')
			let res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 400)

			req = new Request('https://example.com/oauth/authorize?scope=foobar')
			res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 400)
		})

		test('authorize unsupported response_type', async () => {
			const db = await makeDB()
			await configureAccess(db, accessDomain, accessAud)

			const params = new URLSearchParams({
				redirect_uri: 'https://example.com',
				response_type: 'hein',
				client_id: 'client_id',
			})

			const req = new Request('https://example.com/oauth/authorize?' + params)
			const res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 400)
		})

		test("authorize redirect_uri doesn't match client redirect_uris", async () => {
			const db = await makeDB()
			const client = await createTestClient(db, 'https://redirect.com')
			await configureAccess(db, accessDomain, accessAud)

			const params = new URLSearchParams({
				redirect_uri: 'https://example.com/a',
				response_type: 'code',
				client_id: client.id,
			})

			const headers = { 'Cf-Access-Jwt-Assertion': TEST_JWT }

			const req = new Request('https://example.com/oauth/authorize?' + params, {
				headers,
			})
			const res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 403)
		})

		test('authorize redirects with code on success and show first login', async () => {
			const db = await makeDB()
			const client = await createTestClient(db)
			await configureAccess(db, accessDomain, accessAud)

			const params = new URLSearchParams({
				redirect_uri: client.redirect_uris,
				response_type: 'code',
				client_id: client.id,
			})

			const headers = { 'Cf-Access-Jwt-Assertion': TEST_JWT }

			const req = new Request('https://example.com/oauth/authorize?' + params, {
				headers,
			})
			const res = await oauth_authorize.handleRequest(req, db, userKEK)
			assert.equal(res.status, 302)

			const location = new URL(res.headers.get('location') || '')
			assert.equal(
				location.searchParams.get('redirect_uri'),
				encodeURIComponent(`${client.redirect_uris}?code=${client.id}.${TEST_JWT}`)
			)

			// actor isn't created yet
			const { count } = await db.prepare('SELECT count(*) as count FROM actors').first()
			assert.equal(count, 0)
		})

		test('first login creates the user and redirects', async () => {
			const db = await makeDB()

			const params = new URLSearchParams({
				redirect_uri: 'https://redirect.com/a',
				email: 'a@cloudflare.com',
			})

			const formData = new FormData()
			formData.set('username', 'username')
			formData.set('name', 'name')

			const req = new Request('https://example.com/first-login?' + params, {
				method: 'POST',
				body: formData,
			})
			const res = await first_login.handlePostRequest(req, db, userKEK)
			assert.equal(res.status, 302)

			const location = res.headers.get('location')
			assert.equal(location, 'https://redirect.com/a')

			const actor = await db.prepare('SELECT * FROM actors').first()
			const properties = JSON.parse(actor.properties)

			assert.equal(actor.email, 'a@cloudflare.com')
			assert.equal(properties.preferredUsername, 'username')
			assert.equal(properties.name, 'name')
			assert(isUrlValid(actor.id))
			// ensure that we generate a correct key pairs for the user
			assert((await getSigningKey(userKEK, db, actor)) instanceof CryptoKey)
		})

		test('token error on unknown client', async () => {
			const db = await makeDB()
			const body = { code: 'some-code' }

			const req = new Request('https://example.com/oauth/token', {
				method: 'POST',
				body: JSON.stringify(body),
			})
			const res = await oauth_token.handleRequest(db, req)
			assert.equal(res.status, 403)
		})

		test('token returns auth infos', async () => {
			const db = await makeDB()
			const testScope = 'test abcd'
			const client = await createTestClient(db, 'https://localhost', testScope)

			const body = {
				code: client.id + '.some-code',
			}

			const req = new Request('https://example.com/oauth/token', {
				method: 'POST',
				body: JSON.stringify(body),
			})
			const res = await oauth_token.handleRequest(db, req)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			const data = await res.json<any>()
			assert.equal(data.access_token, body.code)
			assert.equal(data.scope, testScope)
		})

		test('token handles empty code', async () => {
			const db = await makeDB()
			const body = { code: '' }

			const req = new Request('https://example.com/oauth/token', {
				method: 'POST',
				body: JSON.stringify(body),
			})
			const res = await oauth_token.handleRequest(db, req)
			assert.equal(res.status, 401)
		})

		test('token returns CORS', async () => {
			const db = await makeDB()
			const req = new Request('https://example.com/oauth/token', {
				method: 'OPTIONS',
			})
			const res = await oauth_token.handleRequest(db, req)
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
