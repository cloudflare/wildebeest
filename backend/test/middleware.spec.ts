import { isUrlValid, makeDB, assertCORS } from './utils'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { TEST_JWT, ACCESS_CERTS } from './test-data'
import { strict as assert } from 'node:assert/strict'
import * as middleware_main from 'wildebeest/backend/src/middleware/main'

const userKEK = 'test_kek12'
const domain = 'cloudflare.com'
const accessDomain = 'access.com'
const accessAud = 'abcd'

describe('middleware', () => {
	test('CORS on OPTIONS', async () => {
		const request = new Request('https://example.com', { method: 'OPTIONS' })
		const ctx: any = {
			request,
		}

		const res = await middleware_main.main(ctx)
		assert.equal(res.status, 200)
		assertCORS(res)
	})

	test('test no identity', async () => {
		globalThis.fetch = async (input: RequestInfo) => {
			if (input === 'https://' + accessDomain + '/cdn-cgi/access/certs') {
				return new Response(JSON.stringify(ACCESS_CERTS))
			}

			if (input === 'https://' + accessDomain + '/cdn-cgi/access/get-identity') {
				return new Response('', { status: 404 })
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

		const res = await middleware_main.main(ctx)
		assert.equal(res.status, 401)
	})

	test('test user not found', async () => {
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

		const db = await makeDB()

		const headers = { authorization: 'Bearer APPID.' + TEST_JWT }
		const request = new Request('https://example.com', { headers })
		const ctx: any = {
			env: { DATABASE: db },
			data: {},
			request,
		}

		const res = await middleware_main.main(ctx)
		assert.equal(res.status, 401)
	})

	test('success passes data and calls next', async () => {
		globalThis.fetch = async (input: RequestInfo) => {
			if (input === 'https://' + accessDomain + '/cdn-cgi/access/certs') {
				return new Response(JSON.stringify(ACCESS_CERTS))
			}

			if (input === 'https://' + accessDomain + '/cdn-cgi/access/get-identity') {
				return new Response(
					JSON.stringify({
						email: 'sven@cloudflare.com',
					})
				)
			}

			throw new Error('unexpected request to ' + input)
		}

		const db = await makeDB()
		await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

		const headers = { authorization: 'Bearer APPID.' + TEST_JWT }
		const request = new Request('https://example.com', { headers })
		const ctx: any = {
			next: () => new Response(),
			data: {},
			env: { DATABASE: db, ACCESS_AUD: accessAud, ACCESS_AUTH_DOMAIN: accessDomain },
			request,
		}

		const res = await middleware_main.main(ctx)
		assert.equal(res.status, 200)
		assert(!ctx.data.connectedUser)
		assert(isUrlValid(ctx.data.connectedActor.id))
		assert.equal(ctx.env.ACCESS_AUTH_DOMAIN, accessDomain)
		assert.equal(ctx.env.ACCESS_AUD, accessAud)
	})
})
