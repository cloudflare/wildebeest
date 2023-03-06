// Also known as boost.

import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import type { Database, Result } from 'wildebeest/backend/src/database'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { getResultsField } from './utils'
import { addObjectInOutbox } from '../activitypub/actors/outbox'

/**
 * Creates a reblog and inserts it in the reblog author's outbox
 *
 * @param db Database
 * @param actor Reblogger
 * @param obj ActivityPub object to reblog
 */
export async function createReblog(db: Database, actor: Actor, obj: APObject) {
	await insertReblog(db, actor, obj).then(async (result: string) => {
		if(result === 'success') {
			await addObjectInOutbox(db, actor, obj)
		} else {
			throw new Error(result)
		}
	})
}

export async function insertReblog(db: Database, actor: Actor, obj: APObject) {
	const id = crypto.randomUUID()

	// const query = `
	// 	INSERT INTO actor_reblogs (id, actor_id, object_id)
	// 	VALUES (?, ?, ?)
	// `

	// const out = await db.prepare(query).bind(id, actor.id.toString(), obj.id.toString()).run()
	// if (!out.success) {
	// 	throw new Error('SQL error: ' + out.error)
	// }
	const insertQuery = `
		INSERT INTO actor_reblogs (id, actor_id, object_id)
		VALUES (?, ?, ?)
		RETURNING *
	;`
	
	try {
		const insertQueryResults: Result = await db.prepare(insertQuery).bind(id, actor.id.toString(), obj.id.toString()).run()
		return (insertQueryResults.success === true) ? 'success' : 'Unexpected error occurred'
	} catch (e: any) {
		const message: string = `Mastodon reblog of '${obj.id.toString()}' by user '${actor.id.toString()}' failed due to SQL error: ${e.message}\n${
			e.cause?.message ?? e.cause
		}\nobj.type, actor.id.toString(), obj.id.toString() = ${obj.type}, ${actor.id.toString()}, ${obj.id.toString()}`
		console.error(message)
		return message
	}
}

export function getReblogs(db: Database, obj: APObject): Promise<Array<string>> {
	const query = `
		SELECT actor_id FROM actor_reblogs WHERE object_id=?
	`

	const statement = db.prepare(query).bind(obj.id.toString())

	return getResultsField(statement, 'actor_id')
}

export async function hasReblog(db: Database, actorId: URL, objectId: URL): Promise<boolean> {
	const query = `
		SELECT
			count(1) as count
		FROM actor_reblogs
		WHERE
			actor_id=?1 AND
			object_id=?2
		LIMIT 1
	`

	const { count } = await db.prepare(query).bind(actorId.toString(), objectId.toString()).first<{ count: number }>()
	return count > 0
}
