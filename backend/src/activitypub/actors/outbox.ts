import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { OrderedCollection } from 'wildebeest/backend/src/activitypub/objects/collection'
import { getMetadata, loadItems } from 'wildebeest/backend/src/activitypub/objects/collection'
import { PUBLIC_GROUP } from 'wildebeest/backend/src/activitypub/activities'
import { type Database } from 'wildebeest/backend/src/database'

export async function addObjectInOutbox(
	db: Database,
	actor: Actor,
	obj: APObject,
	published_date?: string,
	target: string = PUBLIC_GROUP
) {
	const id = crypto.randomUUID()
	let out: any = null

	if (published_date !== undefined) {
		out = await db
			.prepare('INSERT INTO outbox_objects(id, actor_id, object_id, published_date, target) VALUES(?, ?, ?, ?, ?)')
			.bind(id, actor.id.toString(), obj.id.toString(), published_date, target)
			.run()
	} else {
		out = await db
			.prepare('INSERT INTO outbox_objects(id, actor_id, object_id, target) VALUES(?, ?, ?, ?)')
			.bind(id, actor.id.toString(), obj.id.toString(), target)
			.run()
	}
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export async function get(actor: Actor): Promise<OrderedCollection<Activity>> {
	const collection = await getMetadata(actor.outbox)
	collection.items = await loadItems(collection, 20)

	return collection
}

export async function countStatuses(actor: Actor): Promise<number> {
	const metadata = await getMetadata(actor.outbox)
	return metadata.totalItems
}
