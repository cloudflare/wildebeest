import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { OrderedCollection } from 'wildebeest/backend/src/activitypub/objects/collection'
import { getMetadata, loadItems } from 'wildebeest/backend/src/activitypub/objects/collection'
import { type Database } from 'wildebeest/backend/src/database'

export async function countFollowing(actor: Actor): Promise<number> {
	const collection = await getMetadata(actor.following)
	return collection.totalItems
}

export async function countFollowers(actor: Actor): Promise<number> {
	const collection = await getMetadata(actor.followers)
	return collection.totalItems
}

export async function getFollowers(actor: Actor): Promise<OrderedCollection<string>> {
	const collection = await getMetadata(actor.followers)
	collection.items = await loadItems<string>(collection)
	return collection
}

export async function getFollowing(actor: Actor): Promise<OrderedCollection<string>> {
	const collection = await getMetadata(actor.following)
	collection.items = await loadItems<string>(collection)
	return collection
}

export async function loadActors(db: Database, collection: OrderedCollection<string>): Promise<Array<Actor>> {
	const promises = collection.items.map((item) => {
		const actorId = new URL(item)
		return actors.getAndCache(actorId, db)
	})

	return Promise.all(promises)
}
