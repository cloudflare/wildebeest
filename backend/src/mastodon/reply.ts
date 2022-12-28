import type { Object } from 'wildebeest/backend/src/activitypub/objects'

export async function insertReply(db: D1Database, actorId: URL, obj: Object, inReplyToObj: Object) {
	const id = crypto.randomUUID()
	const query = `
        INSERT INTO actor_replies (id, actor_id, object_id, in_reply_to_object_id)
        VALUES (?, ?, ?, ?)
    `
	const { success, error } = await db
		.prepare(query)
		.bind(id, actorId.toString(), obj.id.toString(), inReplyToObj.id.toString())
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}
