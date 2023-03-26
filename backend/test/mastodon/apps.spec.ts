import { makeDB, assertCORS, assertJSON, createTestClient, generateVAPIDKeys } from '../utils'
import { TEST_JWT } from '../test-data'
import { strict as assert } from 'node:assert/strict'
import * as apps from 'wildebeest/functions/api/v1/apps'
import * as verify_app from 'wildebeest/functions/api/v1/apps/verify_credentials'
import { CredentialApp } from 'wildebeest/functions/api/v1/apps/verify_credentials'
import { VAPIDPublicKey } from 'wildebeest/backend/src/mastodon/subscription'

describe('Mastodon APIs', () => {
	describe('/apps', () => {
		test('POST /apps registers client', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const request = new Request('https://example.com', {
				method: 'POST',
				body: '{"redirect_uris":"mastodon://joinmastodon.org/oauth","website":"https://app.joinmastodon.org/ios","client_name":"Mastodon for iOS","scopes":"read write follow push"}',
				headers: {
					'content-type': 'application/json',
				},
			})

			const res = await apps.handleRequest(db, request, vapidKeys)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { name, website, redirect_uri, client_id, client_secret, vapid_key, id, ...rest } = await res.json<
				Record<string, string>
			>()

			assert.equal(name, 'Mastodon for iOS')
			assert.equal(website, 'https://app.joinmastodon.org/ios')
			assert.equal(redirect_uri, 'mastodon://joinmastodon.org/oauth')
			assert.equal(id, '20')
			assert.deepEqual(rest, {})
		})

		test('POST /apps registers client without website', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const request = new Request('https://example.com', {
				method: 'POST',
				body: '{"redirect_uris":"mastodon://example.com/oauth","client_name":"Example mastodon client","scopes":"read write follow push"}',
				headers: {
					'content-type': 'application/json',
				},
			})

			const res = await apps.handleRequest(db, request, vapidKeys)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { name, redirect_uri, client_id, client_secret, vapid_key, id, ...rest } = await res.json<
				Record<string, string>
			>()

			assert.equal(name, 'Example mastodon client')
			assert.equal(redirect_uri, 'mastodon://example.com/oauth')
			assert.equal(id, '20')
			assert.deepEqual(rest, {})
		})

		test('POST /apps returns 422 for malformed requests', async () => {
			// client_name and redirect_uris are required according to https://docs.joinmastodon.org/methods/apps/#form-data-parameters
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const headers = { 'content-type': 'application/json' }

			const validURIException = new Request('https://example.com', {
				method: 'POST',
				body: '{"redirect_uris":"urn:ietf:wg:oauth:2.0:oob","client_name":"Mastodon for iOS"}',
				headers: headers,
			})
			let res = await apps.handleRequest(db, validURIException, vapidKeys)
			assert.equal(res.status, 200)

			const invalidURIRequest = new Request('https://example.com', {
				method: 'POST',
				body: '{"redirect_uris":"joinmastodon.org/oauth","client_name":"Mastodon for iOS"}',
				headers: headers,
			})
			res = await apps.handleRequest(db, invalidURIRequest, vapidKeys)
			assert.equal(res.status, 422)

			const missingURIRequest = new Request('https://example.com', {
				method: 'POST',
				body: '{"client_name":"Mastodon for iOS"}',
				headers: headers,
			})
			res = await apps.handleRequest(db, missingURIRequest, vapidKeys)
			assert.equal(res.status, 422)

			const missingClientNameRequest = new Request('https://example.com', {
				method: 'POST',
				body: '{"redirect_uris":"joinmastodon.org/oauth"}',
				headers: headers,
			})
			res = await apps.handleRequest(db, missingClientNameRequest, vapidKeys)
			assert.equal(res.status, 422)
		})

		test('GET /apps is bad request', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()
			const request = new Request('https://example.com')
			const ctx: any = {
				next: () => new Response(),
				data: null,
				env: {
					DATABASE: db,
					VAPID_JWK: JSON.stringify(vapidKeys),
				},
				request,
			}

			const res = await apps.onRequest(ctx)
			assert.equal(res.status, 405)
		})

		test('GET /verify_credentials returns public VAPID key for known clients', async () => {
			const db = await makeDB()
			const testScope = 'test abcd'
			const client = await createTestClient(db, 'https://localhost', testScope)
			const vapidKeys = await generateVAPIDKeys()

			const headers = { authorization: 'Bearer ' + client.id + '.' + TEST_JWT }

			const req = new Request('https://example.com/api/v1/verify_credentials', { headers })

			const res = await verify_app.handleRequest(db, req, vapidKeys)
			assert.equal(res.status, 200)
			assertCORS(res)
			assertJSON(res)

			const jsonResponse: CredentialApp = await res.json()
			const publicVAPIDKey = VAPIDPublicKey(vapidKeys)
			assert.equal(jsonResponse.name, 'test client')
			assert.equal(jsonResponse.website, 'https://cloudflare.com')
			assert.equal(jsonResponse.vapid_key, publicVAPIDKey)
		})

		test('GET /verify_credentials returns 403 for unauthorized clients', async () => {
			const db = await makeDB()
			const vapidKeys = await generateVAPIDKeys()

			const headers = { authorization: 'Bearer APPID.' + TEST_JWT }

			const req = new Request('https://example.com/api/v1/verify_credentials', { headers })

			const res = await verify_app.handleRequest(db, req, vapidKeys)
			assert.equal(res.status, 403)
		})
	})
})
