import type { MessageBody, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from './'
import { generateDigestHeader } from 'wildebeest/backend/src/utils/http-signing-cavage'
import { signRequest } from 'wildebeest/backend/src/utils/http-signing'

const headers = {
	'content-type': 'application/activity+json',
}

export async function handleDeliverMessage(env: Env, actor: Actor, message: DeliverMessageBody) {
	const toActorId = new URL(message.toActorId)
	const targetActor = await actors.getAndCache(toActorId, env.DATABASE)
	if (targetActor === null) {
		console.warn(`actor ${toActorId} not found`)
		return
	}

	const body = JSON.stringify(message.activity)

	const req = new Request(targetActor.inbox, {
		method: 'POST',
		body,
		headers,
	})
	const digest = await generateDigestHeader(body)
	req.headers.set('Digest', digest)
	const signingKey = await getSigningKey(message.userKEK, env.DATABASE, actor)
	await signRequest(req, signingKey, actor.id)

	const res = await fetch(req)
	if (!res.ok) {
		const body = await res.text()
		console.error(`delivery to ${targetActor.inbox} returned ${res.status}: ${body}`)
		return
	}
	{
		const body = await res.text()
		console.log(`${targetActor.inbox} returned 200: ${body}`)
	}
}
