import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { Object } from 'wildebeest/backend/src/activitypub/objects'

export async function insertReply(db: D1Database, actor: Actor, obj: Object, inReplyToObj: Object) {
	const id = crypto.randomUUID()
	const query = `
        INSERT INTO actor_replies (id, actor_id, object_id, in_reply_to_object_id)
        VALUES (?, ?, ?, ?)
    `
	const { success, error } = await db
		.prepare(query)
		.bind(id, actor.id.toString(), obj.id.toString(), inReplyToObj.id.toString())
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}
