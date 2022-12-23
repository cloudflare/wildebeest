import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { NotificationType } from 'wildebeest/backend/src/types/notification'

export async function insertNotification(
	db: D1Database,
	type: NotificationType,
	actor: Actor,
	fromActor: Actor,
	obj: Object
) {
	const id = crypto.randomUUID()

	const query = `
          INSERT INTO actor_notifications (id, type, actor_id, from_actor_id, object_id)
          VALUES (?, ?, ?, ?, ?)
`
	const out = await db
		.prepare(query)
		.bind(id, type, actor.id.toString(), fromActor.id.toString(), obj.id.toString())
		.run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export async function insertFollowNotification(db: D1Database, actor: Actor, fromActor: Actor) {
	const id = crypto.randomUUID()
	const type: NotificationType = 'follow'

	const query = `
          INSERT INTO actor_notifications (id, type, actor_id, from_actor_id)
          VALUES (?, ?, ?, ?)
`
	const out = await db.prepare(query).bind(id, type, actor.id.toString(), fromActor.id.toString()).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}
