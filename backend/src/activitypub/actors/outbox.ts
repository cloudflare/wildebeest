import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { OrderedCollection, OrderedCollectionPage } from 'wildebeest/backend/src/activitypub/core'

export async function addObjectInOutbox(db: D1Database, actor: Actor, obj: Object) {
	const id = crypto.randomUUID()
	const out = await db
		.prepare('INSERT INTO outbox_objects(id, actor_id, object_id) VALUES(?, ?, ?)')
		.bind(id, actor.id, obj.id.toString())
		.run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

const headers = {
	accept: 'application/activity+json',
}

export async function get(actor: Actor): Promise<OrderedCollection<Activity>> {
	const res = await fetch(actor.outbox, { headers })
	if (!res.ok) {
		throw new Error(`${actor.outbox} returned ${res.status}`)
	}

	const collection = await res.json<OrderedCollection<Activity>>()
	collection.items = await loadItems(collection, 20)

	return collection
}

async function loadItems<T>(collection: OrderedCollection<T>, max: number): Promise<Array<T>> {
	// FIXME: implement max and multi page support

	const res = await fetch(collection.first, { headers })
	if (!res.ok) {
		throw new Error(`${collection.first} returned ${res.status}`)
	}

	const data = await res.json<OrderedCollectionPage<T>>()
	return data.orderedItems
}
