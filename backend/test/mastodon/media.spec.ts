import * as media from 'wildebeest/functions/api/v2/media'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { strict as assert } from 'node:assert/strict'
import { makeDB, assertJSON, isUrlValid } from '../utils'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import { mastodonIdSymbol, originalActorIdSymbol } from 'wildebeest/backend/src/activitypub/objects'

const userKEK = 'test_kek10'
const CF_ACCOUNT_ID = 'testaccountid'
const CF_API_TOKEN = 'testtoken'
const domain = 'cloudflare.com'

describe('Mastodon APIs', () => {
	describe('media', () => {
		test('upload image creates object', async () => {
			globalThis.fetch = async (input: RequestInfo) => {
				const request = new Request(input)
				if (request.url.toString() === 'https://api.cloudflare.com/client/v4/accounts/testaccountid/images/v1') {
					return new Response(
						JSON.stringify({
							success: true,
							result: {
								id: 'abcd',
								variants: ['https://example.com/' + file.name + '/usercontent'],
							},
						})
					)
				}
				throw new Error('unexpected request to ' + request.url)
			}

			const db = await makeDB()
			const connectedActor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			const file = new File(['abc'], 'image.jpeg', { type: 'image/jpeg' })

			const body = new FormData()
			body.set('file', file)

			const req = new Request('https://example.com/api/v2/media', {
				method: 'POST',
				body,
			})
			const res = await media.handleRequestPost(req, db, connectedActor, CF_ACCOUNT_ID, CF_API_TOKEN)
			assert.equal(res.status, 200)
			assertJSON(res)

			const data = await res.json<any>()
			assert(!isUrlValid(data.id))
			assert(isUrlValid(data.url))
			assert(isUrlValid(data.preview_url))

			const obj = await objects.getObjectByMastodonId(db, data.id)
			assert(obj)
			assert(obj[mastodonIdSymbol])
			assert.equal(obj.type, 'Image')
			assert.equal(obj[originalActorIdSymbol], connectedActor.id.toString())
		})
	})
})
