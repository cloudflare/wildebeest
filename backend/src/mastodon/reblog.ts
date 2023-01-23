// Also known as boost.

import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { getResultsField } from './utils'
import { addObjectInOutbox } from '../activitypub/actors/outbox'

/**
 * Creates a reblog and inserts it in the reblog author's outbox
 *
 * @param db D1Database
 * @param actor Reblogger
 * @param obj Object to reblog
 */
export async function createReblog(db: D1Database, actor: Actor, obj: Object) {
	await Promise.all([addObjectInOutbox(db, actor, obj), insertReblog(db, actor, obj)])
}

export async function insertReblog(db: D1Database, actor: Actor, obj: Object) {
	const id = crypto.randomUUID()

	const query = `
		INSERT INTO actor_reblogs (id, actor_id, object_id)
		VALUES (?, ?, ?)
	`

	const out = await db.prepare(query).bind(id, actor.id.toString(), obj.id.toString()).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export function getReblogs(db: D1Database, obj: Object): Promise<Array<string>> {
	const query = `
		SELECT actor_id FROM actor_reblogs WHERE object_id=?
	`

	const statement = db.prepare(query).bind(obj.id.toString())

	return getResultsField(statement, 'actor_id')
}
