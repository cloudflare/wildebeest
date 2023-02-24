import { makeDB } from '../utils'
import { strict as assert } from 'node:assert/strict'
import { createPerson, getActorById } from 'wildebeest/backend/src/activitypub/actors'
import * as account_alias from 'wildebeest/functions/api/wb/settings/account/alias'

const domain = 'cloudflare.com'
const userKEK = 'test_kek22'

describe('Wildebeest', () => {
	describe('Settings', () => {
		test('add account alias', async () => {
			const db = await makeDB()
			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')

			globalThis.fetch = async (input: RequestInfo) => {
				if (input.toString() === 'https://example.com/.well-known/webfinger?resource=acct%3Atest%40example.com') {
					return new Response(
						JSON.stringify({
							links: [
								{
									rel: 'self',
									type: 'application/activity+json',
									href: 'https://social.com/someone',
								},
							],
						})
					)
				}

				if (input.toString() === 'https://social.com/someone') {
					return new Response(
						JSON.stringify({
							id: 'https://social.com/someone',
							type: 'Person',
						})
					)
				}

				throw new Error('unexpected request to ' + input)
			}

			const alias = 'test@example.com'

			const req = new Request('https://example.com', {
				method: 'POST',
				body: JSON.stringify({ alias }),
			})
			const res = await account_alias.handleRequestPost(db, req, actor)
			assert.equal(res.status, 201)

			// Ensure the actor has the alias set
			const newActor = await getActorById(db, actor.id)
			assert(newActor)
			assert(newActor.alsoKnownAs)
			assert.equal(newActor.alsoKnownAs.length, 1)
			assert.equal(newActor.alsoKnownAs[0], 'https://social.com/someone')
		})
	})
})
