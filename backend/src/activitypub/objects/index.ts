import { instanceConfig } from 'wildebeest/config/instance'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'

// https://www.w3.org/TR/activitystreams-vocabulary/#object-types
export interface Object {
	type: string
	id: string // FIXME: switch to entirely to URL
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
	const id = uri(crypto.randomUUID()).toString()

	const row: any = await db
		.prepare('INSERT INTO objects(id, type, properties, original_actor_id) VALUES(?, ?, ?, ?) RETURNING *')
		.bind(id, type, JSON.stringify(properties), originalActorId.toString())
		.first()

	return {
		...properties,
		type,
		id,
		url: id,
		published: new Date(row.cdate).toISOString(),
		originalActorId: row.original_actor_id,
	}
}

export async function get<T>(url: URL): Promise<T> {
	const headers = {
		accept: 'application/activity+json',
	}
	const res = await fetch(url, { headers })
	if (!res.ok) {
		throw new Error(`${url} returned: ${res.status}`)
	}

	return res.json<T>()
}

export async function cacheObject(
	db: D1Database,
	properties: any,
	originalActorId: URL,
	originalObjectId: URL
): Promise<Object> {
	const cachedObject = await getObjectBy(db, 'original_object_id', originalObjectId.toString())
	if (cachedObject !== null) {
		return cachedObject
	}

	const id = uri(crypto.randomUUID()).toString()

	const row: any = await db
		.prepare(
			'INSERT INTO objects(id, type, properties, original_actor_id, original_object_id) VALUES(?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(id, properties.type, JSON.stringify(properties), originalActorId.toString(), originalObjectId.toString())
		.first()

	{
		const properties = JSON.parse(row.properties)

		return {
			published: new Date(row.cdate).toISOString(),
			...properties,
			id: row.id,
			url: row.id,
			originalActorId: row.original_actor_id,
			originalObjectId: row.original_object_id,
		}
	}
}

export async function getObjectById(db: D1Database, id: string | URL): Promise<Object | null> {
	return getObjectBy(db, 'id', id.toString())
}

async function getObjectBy(db: D1Database, key: string, value: string): Promise<Object | null> {
	const query = `
SELECT *
FROM objects
WHERE objects.${key}=?
  `
	const { results, success, error } = await db.prepare(query).bind(value).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results || results.length === 0) {
		return null
	}

	const result: any = results[0]
	const properties = JSON.parse(result.properties)

	return {
		published: new Date(result.cdate).toISOString(),
		...properties,

		id: result.id,
		type: result.type,
		url: result.id,
		originalActorId: result.original_actor_id,
		originalObjectId: result.original_object_id,
	}
}
