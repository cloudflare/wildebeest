import { addPeer } from 'wildebeest/backend/src/activitypub/peers'
import { strict as assert } from 'node:assert/strict'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as v1_instance from 'wildebeest/functions/api/v1/instance'
import * as v2_instance from 'wildebeest/functions/api/v2/instance'
import * as peers from 'wildebeest/functions/api/v1/instance/peers'
import { makeDB, assertCORS, assertJSON } from '../utils'

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

		test('returns peers', async () => {
			const db = await makeDB()
			await addPeer(db, 'a')
			await addPeer(db, 'b')

			const res = await peers.handleRequest(db)
			assert.equal(res.status, 200)

			const data = await res.json<Array<string>>()
			assert.equal(data.length, 2)
			assert.equal(data[0], 'a')
			assert.equal(data[1], 'b')
		})

		test('return the instance infos v1', async () => {
			const db = await makeDB()

			const env = {
				INSTANCE_TITLE: 'a',
				ADMIN_EMAIL: 'b',
				INSTANCE_DESCR: 'c',
			} as Env

			const res = await v1_instance.handleRequest(domain, db, env)
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
			const db = await makeDB()

			const env = {
				INSTANCE_DESCR: 'c',
			} as Env

			const res = await v1_instance.handleRequest(domain, db, env)
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
})
