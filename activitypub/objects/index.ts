import { instanceConfig } from 'wildebeest/config/instance'
import type { Actor } from 'wildebeest/activitypub/actors/'

// https://www.w3.org/TR/activitystreams-vocabulary/#object-types
export interface Object {
	type: string
	id: string
	url: URL
	published?: string
	icon?: Object
	image?: Object
	summary?: string
	name?: string
	mediaType?: string
	content?: string

	// Extension
	preferredUsername?: string
	// Internal
	originalActorId?: string
	originalObjectId?: string
}

export function uri(id: string): URL {
	return new URL('/ap/o/' + id, 'https://' + instanceConfig.uri)
}

export async function createObject(
	db: D1Database,
	type: string,
	properties: any,
	originalActorId: URL
): Promise<Object> {
	const id = crypto.randomUUID()

	const row: any = await db
		.prepare('INSERT INTO objects(id, type, properties, original_actor_id) VALUES(?, ?, ?, ?) RETURNING *')
		.bind(id, type, JSON.stringify(properties), originalActorId.toString())
		.first()

	return {
		...properties,
		type,
		id: row.id,
		url: uri(row.id),
		published: new Date(row.cdate).toISOString(),
		originalActorId: row.original_actor_id,
	}
}

export async function cacheObject(
	db: D1Database,
	properties: any,
	originalActorId: URL,
	originalObjectId: URL
): Promise<Object> {
	const id = crypto.randomUUID()

	const row: any = await db
		.prepare(
			'INSERT INTO objects(id, type, properties, original_actor_id, original_object_id) VALUES(?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(id, properties.type, JSON.stringify(properties), originalActorId.toString(), originalObjectId.toString())
		.first()

	return {
		...properties,
		id: row.id,
		url: uri(row.id),
		published: new Date(row.cdate).toISOString(),
		originalActorId: row.original_actor_id,
		originalObjectId: row.original_object_id,
	}
}

export async function getObjectById(db: D1Database, id: string): Promise<Object | null> {
	const query = `
SELECT id, properties, type, original_actor_id, original_object_id
FROM objects
WHERE objects.id=?
  `
	const { results, success, error } = await db.prepare(query).bind(id).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results || results.length === 0) {
		return null
	}

	const result: any = results[0]
	const properties = JSON.parse(result.properties)

	return {
		...properties,

		id: result.id,
		type: result.type,
		url: uri(result.id),
		originalActorId: result.original_actor_id,
		originalObjectId: result.original_object_id,
	}
}
