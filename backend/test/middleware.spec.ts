import { isUrlValid, makeDB, assertCORS } from './utils'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { TEST_JWT, ACCESS_CERTS } from './test-data'
import { strict as assert } from 'node:assert/strict'
import { accessConfig } from 'wildebeest/config/access'
import * as middleware_main from 'wildebeest/backend/src/middleware/main'

const userKEK = 'test_kek12'
const domain = 'cloudflare.com'

describe('middleware', () => {
	test('CORS on OPTIONS', async () => {
		const request = new Request('https://example.com', { method: 'OPTIONS' })
		const ctx: any = {
			request,
		}

		const res = await middleware_main.auth(ctx)
		assert.equal(res.status, 200)
		assertCORS(res)
	})

	test('test no identity', async () => {
		globalThis.fetch = async (input: RequestInfo) => {
			if (input === accessConfig.domain + '/cdn-cgi/access/certs') {
				return new Response(JSON.stringify(ACCESS_CERTS))
			}

			if (input === accessConfig.domain + '/cdn-cgi/access/get-identity') {
				return new Response('', { status: 404 })
			}

			throw new Error('unexpected request to ' + input)
		}

		const headers = { authorization: 'Bearer APPID.' + TEST_JWT }
		const request = new Request('https://example.com', { headers })
		const ctx: any = {
			data: {},
			request,
		}

		const res = await middleware_main.auth(ctx)
		assert.equal(res.status, 401)
	})

	test('test user not found', async () => {
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

		const db = await makeDB()

		const headers = { authorization: 'Bearer APPID.' + TEST_JWT }
		const request = new Request('https://example.com', { headers })
		const ctx: any = {
			env: { DATABASE: db },
			data: {},
			request,
		}

		const res = await middleware_main.auth(ctx)
		assert.equal(res.status, 401)
	})

	test('success passes data and calls next', async () => {
		globalThis.fetch = async (input: RequestInfo) => {
			if (input === accessConfig.domain + '/cdn-cgi/access/certs') {
				return new Response(JSON.stringify(ACCESS_CERTS))
			}

			if (input === accessConfig.domain + '/cdn-cgi/access/get-identity') {
				return new Response(
					JSON.stringify({
						email: 'username@cloudflare.com',
					})
				)
			}

			throw new Error('unexpected request to ' + input)
		}

		const db = await makeDB()
		await createPerson(domain, db, userKEK, 'username@cloudflare.com')

		const data: any = {}

		const headers = { authorization: 'Bearer APPID.' + TEST_JWT }
		const request = new Request('https://example.com', { headers })
		const ctx: any = {
			next: () => new Response(),
			data,
			env: { DATABASE: db },
			request,
		}

		const res = await middleware_main.auth(ctx)
		assert.equal(res.status, 200)
		assert(!data.connectedUser)
		assert(isUrlValid(data.connectedActor.id))
	})
})
