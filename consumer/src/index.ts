import type { MessageBody, InboxMessageBody, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { MessageType } from 'wildebeest/backend/src/types/queue'
import { initSentryQueue } from './sentry'
import { handleInboxMessage } from './inbox'
import { handleDeliverMessage } from './deliver'

export type Env = {
	DATABASE: Database
	DOMAIN: string
	ADMIN_EMAIL: string
	DO_CACHE: DurableObjectNamespace

	SENTRY_DSN: string
	SENTRY_ACCESS_CLIENT_ID: string
	SENTRY_ACCESS_CLIENT_SECRET: string

	NEON_DATABASE_URL?: string
}

export default {
	async queue(batch: MessageBatch<MessageBody>, env: Env, ctx: ExecutionContext) {
		const sentry = initSentryQueue(env, ctx)
		const db = await getDatabase(env)

		try {
			for (const message of batch.messages) {
				const actor = await actors.getActorById(db, new URL(message.body.actorId))
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
		} catch (err: any) {
			if (sentry !== null) {
				sentry.captureException(err)
			}
			console.error(err.stack, err.cause)
		}
	},
}
