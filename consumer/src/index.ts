import type { MessageBody, InboxMessageBody, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import { MessageType } from 'wildebeest/backend/src/types/queue'

import { handleInboxMessage } from './inbox'
import { handleDeliverMessage } from './deliver'

export type Env = {
	DATABASE: D1Database
	DOMAIN: string
	ADMIN_EMAIL: string
	DO_CACHE: DurableObjectNamespace
}

export default {
	async queue(batch: MessageBatch<MessageBody>, env: Env, ctx: ExecutionContext) {
		for (const message of batch.messages) {
			const actor = await actors.getPersonById(env.DATABASE, new URL(message.body.actorId))
			if (actor === null) {
				console.warn(`actor ${message.body.actorId} is missing`)
				return
			}

			switch (message.body.type) {
				case MessageType.Inbox: {
					await handleInboxMessage(env, actor, message.body as InboxMessageBody)
					break
				}
				case MessageType.Deliver: {
					await handleDeliverMessage(env, actor, message.body as DeliverMessageBody)
					break
				}
				default:
					throw new Error('unsupported message type: ' + message.body.type)
			}
		}
	},
}
