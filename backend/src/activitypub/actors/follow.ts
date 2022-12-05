import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { OrderedCollection, OrderedCollectionPage } from 'wildebeest/backend/src/activitypub/core'

const headers = {
	accept: 'application/activity+json',
}

export async function getFollowingMetadata(actor: Actor): Promise<OrderedCollection<unknown>> {
	const res = await fetch(actor.following, { headers })
	if (!res.ok) {
		throw new Error(`${actor.following} returned ${res.status}`)
	}

	return res.json<OrderedCollection<unknown>>()
}

export async function getFollowersMetadata(actor: Actor): Promise<OrderedCollection<unknown>> {
	const res = await fetch(actor.followers, { headers })
	if (!res.ok) {
		throw new Error(`${actor.followers} returned ${res.status}`)
	}

	return res.json<OrderedCollection<unknown>>()
}
