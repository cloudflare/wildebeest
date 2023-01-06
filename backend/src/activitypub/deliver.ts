// https://www.w3.org/TR/activitypub/#delivery

import * as actors from 'wildebeest/backend/src/activitypub/actors'
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
		await res.text()
	}
}

export async function deliverFollowers(db: D1Database, signingKey: CryptoKey, from: Actor, activity: Activity) {
	const body = JSON.stringify(activity)
	const followers = await getFollowers(db, from)

	const promises = followers.map(async (id) => {
		const follower = new URL(id)

		// FIXME: When an actor follows another Actor we should download its object
		// locally, so we can retrieve the Actor's inbox without a request.

		const targetActor = await actors.getAndCache(follower, db)
		if (targetActor === null) {
			console.warn(`actor ${follower} not found`)
			return
		}

		const req = new Request(targetActor.inbox, {
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
			console.error(`delivery to ${targetActor.inbox} returned ${res.status}: ${body}`)
			return
		}
		{
			await res.text()
		}
	})

	await Promise.allSettled(promises)
}
