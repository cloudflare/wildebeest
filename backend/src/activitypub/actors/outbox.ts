import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { OrderedCollection, OrderedCollectionPage } from 'wildebeest/backend/src/activitypub/core'

export async function addObjectInOutbox(db: D1Database, actor: Actor, obj: Object, published_date?: string) {
	const id = crypto.randomUUID()
	let out: any = null

	if (published_date !== undefined) {
		out = await db
			.prepare('INSERT INTO outbox_objects(id, actor_id, object_id, published_date) VALUES(?, ?, ?, ?)')
			.bind(id, actor.id.toString(), obj.id.toString(), published_date)
			.run()
	} else {
		out = await db
			.prepare('INSERT INTO outbox_objects(id, actor_id, object_id) VALUES(?, ?, ?)')
			.bind(id, actor.id.toString(), obj.id.toString())
			.run()
	}
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

const headers = {
	accept: 'application/activity+json',
}

export async function getMetadata(actor: Actor): Promise<OrderedCollection<unknown>> {
	const res = await fetch(actor.outbox, { headers })
	if (!res.ok) {
		throw new Error(`${actor.outbox} returned ${res.status}`)
	}

	return res.json<OrderedCollection<unknown>>()
}

export async function get(actor: Actor): Promise<OrderedCollection<Activity>> {
	const collection = await getMetadata(actor)
	collection.items = await loadItems(collection, 20)

	return collection
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadItems<T>(collection: OrderedCollection<T>, max: number): Promise<Array<T>> {
	// FIXME: implement max and multi page support

	const res = await fetch(collection.first, { headers })
	if (!res.ok) {
		throw new Error(`${collection.first} returned ${res.status}`)
	}

	const data = await res.json<OrderedCollectionPage<T>>()
	return data.orderedItems
}
