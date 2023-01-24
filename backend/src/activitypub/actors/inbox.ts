import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'

export async function addObjectInInbox(db: D1Database, actor: Actor, obj: APObject) {
	const id = crypto.randomUUID()
	const out = await db
		.prepare('INSERT INTO inbox_objects(id, actor_id, object_id) VALUES(?, ?, ?)')
		.bind(id, actor.id.toString(), obj.id.toString())
		.run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}
