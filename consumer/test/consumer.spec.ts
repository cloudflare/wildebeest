import { MessageType } from 'wildebeest/backend/src/types/queue'
import { strict as assert } from 'node:assert/strict'
import type { DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { makeDB } from 'wildebeest/backend/test/utils'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { handleDeliverMessage } from '../src/deliver'

const domain = 'cloudflare.com'
const userKEK = 'test_kek25'

describe('Consumer', () => {
	describe('Deliver', () => {
		test('deliver to target Actor', async () => {
			const db = await makeDB()

			let receivedActivity: any = null

			globalThis.fetch = async (input: any) => {
				if (input.toString() === 'https://example.com/users/a') {
					return new Response(
						JSON.stringify({
							id: 'https://example.com/users/a',
							type: 'Person',
							preferredUsername: 'someone',
							inbox: 'https://example.com/inbox',
						})
					)
				}

				if (input.url.toString() === 'https://example.com/inbox') {
					assert.equal(input.method, 'POST')
					receivedActivity = await input.json()
					return new Response('')
				}

				throw new Error('unexpected request to ' + input.url)
			}

			const actor = await createPerson(domain, db, userKEK, 'sven@cloudflare.com')
			const note = await createPublicNote(domain, db, 'my first status', actor)

			const activity: any = {
				type: 'Create',
				actor: actor.id.toString(),
				to: ['https://example.com/users/a'],
				cc: [],
				object: note.id,
			}

			const message: DeliverMessageBody = {
				activity,
				type: MessageType.Deliver,
				actorId: actor.id.toString(),
				toActorId: 'https://example.com/users/a',
				userKEK: userKEK,
			}

			const env = {
				DATABASE: db,
			} as any
			await handleDeliverMessage(env, actor, message)

			assert(receivedActivity)
			assert.equal(receivedActivity.type, activity.type)
		})
	})
})
