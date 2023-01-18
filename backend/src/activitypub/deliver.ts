// https://www.w3.org/TR/activitypub/#delivery

import type { MessageSendRequest, Queue, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import { MessageType } from 'wildebeest/backend/src/types/queue'
import type { Activity } from './activities'
import type { Actor } from './actors'
import { generateDigestHeader } from 'wildebeest/backend/src/utils/http-signing-cavage'
import { signRequest } from 'wildebeest/backend/src/utils/http-signing'
import { getFollowers } from 'wildebeest/backend/src/mastodon/follow'

const headers = {
	'content-type': 'application/activity+json',
}

export async function deliverToActor(signingKey: CryptoKey, from: Actor, to: Actor, activity: Activity) {
	const body = JSON.stringify(activity)
	console.log({ body })
	const req = new Request(to.inbox, {
		method: 'POST',
		body,
		headers,
	})
	const digest = await generateDigestHeader(body)
	req.headers.set('Digest', digest)
	await signRequest(req, signingKey, new URL(from.id))

	const res = await fetch(req)
	if (!res.ok) {
		const body = await res.text()
		throw new Error(`delivery to ${to.inbox} returned ${res.status}: ${body}`)
	}
	{
		const body = await res.text()
		console.log(`${to.inbox} returned 200: ${body}`)
	}
}

export async function deliverFollowers(
	db: D1Database,
	userKEK: string,
	from: Actor,
	activity: Activity,
	queue: Queue<DeliverMessageBody>
) {
	const followers = await getFollowers(db, from)
	if (followers.length === 0) {
		// No one is following the user so no updates to send. Sad.
		return
	}

	const messages: Array<MessageSendRequest<DeliverMessageBody>> = await Promise.all(
		followers.map(async (id) => {
			const body = {
				// Make sure the object is supported by `structuredClone()`, ie
				// removing the URL objects as they aren't clonabled.
				activity: JSON.parse(JSON.stringify(activity)),

				actorId: from.id.toString(),
				toActorId: id,
				type: MessageType.Deliver,
				userKEK,
			}
			return { body }
		})
	)

	await queue.sendBatch(messages)
}
