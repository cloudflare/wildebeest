// https://www.w3.org/TR/activitypub/#delivery

import * as actors from 'wildebeest/activitypub/actors/'
import { instanceConfig } from 'wildebeest/config/instance'
import type { Activity } from './activities/'
import type { Actor } from './actors/'
import { generateDigestHeader } from 'wildebeest/utils/http-signing-cavage'
import { signRequest } from 'wildebeest/utils/http-signing'
import { getFollowers } from 'wildebeest/activitypub/actors/follow'

const headers = {
	'content-type': 'application/activity+json',
}

export async function deliverToActor(signingKey: CryptoKey, from: Actor, to: Actor, activity: Activity) {
	const body = JSON.stringify(activity)
	console.log({ body })
	let req = new Request(to.inbox, {
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

export async function deliverFollowers(db: D1Database, signingKey: CryptoKey, from: Actor, activity: Activity) {
	const body = JSON.stringify(activity)
	const followers = await getFollowers(db, from)

	for (let i = 0, len = followers.length; i < len; i++) {
		const follower = new URL(followers[i])

		// FIXME: When an actor follows another Actor we should download its object
		// locally, so we can retrieve the Actor's inbox without a request.

		const targetActor = await actors.getAndCache(follower, db)
		if (targetActor === null) {
			console.warn(`actor ${follower} not found`)
			continue
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
			throw new Error(`delivery to ${targetActor.inbox} returned ${res.status}: ${body}`)
		}
		{
			const body = await res.text()
			console.log(`${targetActor.inbox} returned 200: ${body}`)
		}
	}
}
