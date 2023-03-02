import { addPeer } from 'wildebeest/backend/src/activitypub/peers'
import { strict as assert } from 'node:assert/strict'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as v1_instance from 'wildebeest/functions/api/v1/instance'
import * as v2_instance from 'wildebeest/functions/api/v2/instance'
import * as peers from 'wildebeest/functions/api/v1/instance/peers'
import { makeDB, assertCORS, assertJSON } from 'wildebeest/backend/test/utils'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { MastodonInstance } from 'wildebeest/backend/src/types/instance'

const adminKEK = 'admin'
const userKEK = 'test_kek2'
const admin_email = 'admin@cloudflare.com'
const domain = 'cloudflare.com'

describe('Mastodon APIs', () => {
	describe('/v1', () => {
		describe('/instance', () => {
			const env = {
				INSTANCE_TITLE: 'a',
				ADMIN_EMAIL: admin_email,
				INSTANCE_DESCR: 'c',
			} as Env

			test('return the correct instance admin', async () => {
				const db = await makeDB()
				await createPerson(domain, db, adminKEK, admin_email, {}, true)

				const res = await v1_instance.handleRequest(domain, db, env)
				assert.equal(res.status, 200)
				assertCORS(res)
				assertJSON(res)

				{
					const data = await res.json<MastodonInstance>()
					assert.equal(data.email, admin_email)
					assert.equal(data?.contact_account?.acct, adminKEK)
				}
			})

			test('return the correct instance statistics', async () => {
				const db = await makeDB()
				const person = await createPerson(domain, db, adminKEK, admin_email, {}, true)
				await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
				await addPeer(db, 'a')
				await addPeer(db, 'b')
				await createPublicNote(domain, db, 'my first status', person)

				const res = await v1_instance.handleRequest(domain, db, env)
				assert.equal(res.status, 200)
				assertCORS(res)
				assertJSON(res)

				{
					const data = await res.json<MastodonInstance>()
					assert.equal(data.stats?.user_count, 2)
					assert.equal(data.stats?.status_count, 1)
					assert.equal(data.stats?.domain_count, 3)
				}
			})

			test('return the instance info', async () => {
				const db = await makeDB()
				await createPerson(domain, db, adminKEK, admin_email, {}, true)

				const res = await v1_instance.handleRequest(domain, db, env)
				assert.equal(res.status, 200)
				assertCORS(res)
				assertJSON(res)

				{
					const data = await res.json<MastodonInstance>()
					assert.equal(data.rules?.length, 0)
					assert.equal(data.uri, domain)
					assert.equal(data.title, 'a')
					assert.equal(data.email, admin_email)
					assert.equal(data.description, 'c')
					assert(data.version?.includes('Wildebeest'))
				}
			})

			test('adds a short_description if missing v1', async () => {
				const db = await makeDB()
				await createPerson(domain, db, adminKEK, admin_email, {}, true)

				const res = await v1_instance.handleRequest(domain, db, env)
				assert.equal(res.status, 200)

				{
					const data = await res.json<any>()
					assert.equal(data.short_description, 'c')
				}
			})

			describe('/peers', () => {
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
			})
		})
	})
	describe('/v2', () => {
		describe('/instance', () => {
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

			test('return the instance infos v2', async () => {
				const db = await makeDB()
				await createPerson(domain, db, adminKEK, admin_email, {}, true)

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
})
