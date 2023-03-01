import type { DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import { getDatabase } from 'wildebeest/backend/src/database'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from './'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'

export async function handleDeliverMessage(env: Env, actor: Actor, message: DeliverMessageBody) {
	const toActorId = new URL(message.toActorId)
	const targetActor = await actors.getAndCache(toActorId, await getDatabase(env))
	if (targetActor === null) {
		console.warn(`actor ${toActorId} not found`)
		return
	}

	const signingKey = await getSigningKey(message.userKEK, await getDatabase(env), actor)
	await deliverToActor(signingKey, actor, targetActor, message.activity, env.DOMAIN)
}
