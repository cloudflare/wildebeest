import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import { type Database } from 'wildebeest/backend/src/database'
import {
	mastodonIdSymbol,
	originalActorIdSymbol,
	originalObjectIdSymbol,
} from 'wildebeest/backend/src/activitypub/objects'

export async function insertKey(db: Database, key: string, obj: APObject): Promise<void> {
	const query = `
        INSERT INTO idempotency_keys (key, object_id, expires_at)
        VALUES (?1, ?2, datetime('now', '+1 hour'))
    `

	const { success, error } = await db.prepare(query).bind(key, obj.id.toString()).run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

export async function hasKey(db: Database, key: string): Promise<APObject | null> {
	const query = `
        SELECT objects.*
        FROM idempotency_keys
        INNER JOIN objects ON objects.id = idempotency_keys.object_id
        WHERE idempotency_keys.key = ?1 AND expires_at >= datetime() 
    `

	const { results, success, error } = await db.prepare(query).bind(key).all<any>()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results || results.length === 0) {
		return null
	}

	const result = results[0]
	let properties
	if (typeof result.properties === 'object') {
		// neon uses JSONB for properties which is returned as a deserialized
		// object.
		properties = result.properties
	} else {
		// D1 uses a string for JSON properties
		properties = JSON.parse(result.properties)
	}

	return {
		published: new Date(result.cdate).toISOString(),
		...properties,

		type: result.type,
		id: new URL(result.id),

		[mastodonIdSymbol]: result.mastodon_id,
		[originalActorIdSymbol]: result.original_actor_id,
		[originalObjectIdSymbol]: result.original_object_id,
	} as APObject
}
