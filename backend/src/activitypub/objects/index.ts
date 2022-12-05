import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { UUID } from 'wildebeest/backend/src/types'

// https://www.w3.org/TR/activitystreams-vocabulary/#object-types
export interface Object {
	type: string
	id: URL
	url: URL
	published?: string
	icon?: Object
	image?: Object
	summary?: string
	name?: string
	mediaType?: string
	content?: string
	inReplyTo?: string

	// Extension
	preferredUsername?: string
	// Internal
	originalActorId?: string
	originalObjectId?: string
	mastodonId?: UUID
}

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-document
export interface Document extends Object {}

export function uri(domain: string, id: string): URL {
	return new URL('/ap/o/' + id, 'https://' + domain)
}

export async function createObject(
	domain: string,
	db: D1Database,
	type: string,
	properties: any,
	originalActorId: URL,
	local: boolean
): Promise<Object> {
	const uuid = crypto.randomUUID()
	const apId = uri(domain, uuid).toString()

	const row: any = await db
		.prepare(
			'INSERT INTO objects(id, type, properties, original_actor_id, local, mastodon_id) VALUES(?, ?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(apId, type, JSON.stringify(properties), originalActorId.toString(), local ? 1 : 0, uuid)
		.first()

	return {
		...properties,

		type,
		id: new URL(row.id),
		mastodonId: row.mastodon_id,
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
	domain: string,
	db: D1Database,
	properties: any,
	originalActorId: URL,
	originalObjectId: URL,
	local: boolean
): Promise<Object> {
	const cachedObject = await getObjectBy(db, 'original_object_id', originalObjectId.toString())
	if (cachedObject !== null) {
		return cachedObject
	}

	const uuid = crypto.randomUUID()
	const apId = uri(domain, uuid).toString()

	const row: any = await db
		.prepare(
			'INSERT INTO objects(id, type, properties, original_actor_id, original_object_id, local, mastodon_id) VALUES(?, ?, ?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(
			apId,
			properties.type,
			JSON.stringify(properties),
			originalActorId.toString(),
			originalObjectId.toString(),
			local ? 1 : 0,
			uuid
		)
		.first()

	{
		const properties = JSON.parse(row.properties)

		return {
			published: new Date(row.cdate).toISOString(),
			...properties,

			type: row.type,
			id: new URL(row.id),
			mastodonId: row.mastodon_id,
			originalActorId: row.original_actor_id,
			originalObjectId: row.original_object_id,
		}
	}
}

export async function updateObject(db: D1Database, properties: any, id: URL): Promise<boolean> {
	const res: any = await db
		.prepare('UPDATE objects SET properties = ? WHERE id = ?')
		.bind(JSON.stringify(properties), id.toString())
		.run()

	// TODO: D1 doesn't return changes at the moment
	// return res.changes === 1
	return true
}

export async function getObjectById(db: D1Database, id: string | URL): Promise<Object | null> {
	return getObjectBy(db, 'id', id.toString())
}

export async function getObjectByOriginalId(db: D1Database, id: string | URL): Promise<Object | null> {
	return getObjectBy(db, 'original_object_id', id.toString())
}

export async function getObjectByMastodonId(db: D1Database, id: UUID): Promise<Object | null> {
	return getObjectBy(db, 'mastodon_id', id)
}

export async function getObjectBy(db: D1Database, key: string, value: string): Promise<Object | null> {
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

		type: result.type,
		id: new URL(result.id),
		mastodonId: result.mastodon_id,
		originalActorId: result.original_actor_id,
		originalObjectId: result.original_object_id,
	}
}
