import type { Object } from 'wildebeest/activitypub/objects/'
import type { Actor } from 'wildebeest/activitypub/actors/'
import type { NotificationType } from 'wildebeest/types/notification'

export async function insertNotification(
	db: D1Database,
	type: NotificationType,
	actor: Actor,
	fromActor: Actor,
	obj: Object
) {
	try {
		const id = crypto.randomUUID()

		const query = `
          INSERT INTO actor_notifications (id, type, actor_id, from_actor_id, object_id)
          VALUES (?, ?, ?, ?, ?)
`
		const out = await db.prepare(query).bind(id, type, actor.id, fromActor.id, obj.id).run()
		if (!out.success) {
			throw new Error('SQL error: ' + out.error)
		}
	} catch (err: any) {
		console.log(err.cause)
		throw err
	}
}
