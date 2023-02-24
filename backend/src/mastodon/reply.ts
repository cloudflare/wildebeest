import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { type Database } from 'wildebeest/backend/src/database'
import { toMastodonStatusFromRow } from './status'
import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import type { MastodonStatus } from 'wildebeest/backend/src/types/status'

export async function insertReply(db: Database, actor: Actor, obj: APObject, inReplyToObj: APObject) {
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

export async function getReplies(domain: string, db: Database, obj: APObject): Promise<Array<MastodonStatus>> {
	const QUERY = `
SELECT objects.*,
       actors.id as actor_id,
       actors.cdate as actor_cdate,
       actors.properties as actor_properties,
       actor_replies.actor_id as publisher_actor_id,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count,
       (SELECT count(*) FROM actor_replies WHERE actor_replies.in_reply_to_object_id=objects.id) as replies_count
FROM actor_replies
INNER JOIN objects ON objects.id=actor_replies.object_id
INNER JOIN actors ON actors.id=actor_replies.actor_id
WHERE actor_replies.in_reply_to_object_id=?
ORDER by actor_replies.cdate DESC
LIMIT ?
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db.prepare(QUERY).bind(obj.id.toString(), DEFAULT_LIMIT).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
	if (!results) {
		return []
	}

	const out: Array<MastodonStatus> = []

	for (let i = 0, len = results.length; i < len; i++) {
		const status = await toMastodonStatusFromRow(domain, db, results[i])
		if (status !== null) {
			out.push(status)
		}
	}

	return out
}
