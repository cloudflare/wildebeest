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

export async function createObject<Type extends Object>(
	domain: string,
	db: D1Database,
	type: string,
	properties: any,
	originalActorId: URL,
	local: boolean
): Promise<Type> {
	const uuid = crypto.randomUUID()
	const apId = uri(domain, uuid).toString()
	const sanitizedObject = await sanitizeObjectProperties(properties)

	const row: any = await db
		.prepare(
			'INSERT INTO objects(id, type, properties, original_actor_id, local, mastodon_id) VALUES(?, ?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(apId, type, JSON.stringify(sanitizedObject), originalActorId.toString(), local ? 1 : 0, uuid)
		.first()

	return {
		...sanitizedObject,
		type,
		id: new URL(row.id),
		mastodonId: row.mastodon_id,
		published: new Date(row.cdate).toISOString(),
		originalActorId: row.original_actor_id,
	} as Type
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

type CacheObjectRes = {
	created: boolean
	object: Object
}

export async function cacheObject(
	domain: string,
	db: D1Database,
	properties: unknown,
	originalActorId: URL,
	originalObjectId: URL,
	local: boolean
): Promise<CacheObjectRes> {
	const sanitizedObject = await sanitizeObjectProperties(properties)

	const cachedObject = await getObjectBy(db, 'original_object_id', originalObjectId.toString())
	if (cachedObject !== null) {
		return {
			created: false,
			object: cachedObject,
		}
	}

	const uuid = crypto.randomUUID()
	const apId = uri(domain, uuid).toString()

	const row: any = await db
		.prepare(
			'INSERT INTO objects(id, type, properties, original_actor_id, original_object_id, local, mastodon_id) VALUES(?, ?, ?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(
			apId,
			sanitizedObject.type,
			JSON.stringify(sanitizedObject),
			originalActorId.toString(),
			originalObjectId.toString(),
			local ? 1 : 0,
			uuid
		)
		.first()

	{
		const properties = JSON.parse(row.properties)
		const object = {
			published: new Date(row.cdate).toISOString(),
			...properties,

			type: row.type,
			id: new URL(row.id),
			mastodonId: row.mastodon_id,
			originalActorId: row.original_actor_id,
			originalObjectId: row.original_object_id,
		} as Object

		return { object, created: true }
	}
}

export async function updateObject(db: D1Database, properties: any, id: URL): Promise<boolean> {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
	} as Object
}

/** Is the given `value` an ActivityPub Object? */
export function isObject(value: unknown): value is Object {
	return value !== null && typeof value === 'object'
}

/** Sanitizes the ActivityPub Object `properties` prior to being stored in the DB. */
export async function sanitizeObjectProperties(properties: unknown): Promise<Object> {
	if (!isObject(properties)) {
		throw new Error('Invalid object properties. Expected an object but got ' + JSON.stringify(properties))
	}
	const sanitized: Object = {
		...properties,
	}
	if ('content' in properties) {
		sanitized.content = await sanitizeContent(properties.content as string)
	}
	if ('name' in properties) {
		sanitized.name = await sanitizeName(properties.name as string)
	}
	return sanitized
}

/**
 * Sanitizes the given string as ActivityPub Object content.
 *
 * This sanitization follows that of Mastodon
 *  - convert all elements to `<p>` unless they are recognized as one of `<p>`, `<span>`, `<br>` or `<a>`.
 *  - remove all CSS classes that are not micro-formats or semantic.
 *
 * See https://docs.joinmastodon.org/spec/activitypub/#sanitization
 */
export async function sanitizeContent(unsafeContent: string): Promise<string> {
	return await contentRewriter.transform(new Response(unsafeContent)).text()
}

/**
 * Sanitizes given string as an ActivityPub Object name.
 *
 * This sanitization removes all HTML elements from the string leaving only the text content.
 */
export async function sanitizeName(dirty: string): Promise<string> {
	return await nameRewriter.transform(new Response(dirty)).text()
}

const contentRewriter = new HTMLRewriter()
contentRewriter.on('*', {
	element(el) {
		if (!['p', 'span', 'br', 'a'].includes(el.tagName)) {
			el.tagName = 'p'
		}

		if (el.hasAttribute('class')) {
			const classes = el.getAttribute('class')!.split(' ')
			const sanitizedClasses = classes.filter((c) =>
				/^(h|p|u|dt|e)-|^mention$|^hashtag$|^ellipsis$|^invisible$/.test(c)
			)
			el.setAttribute('class', sanitizedClasses.join(' '))
		}
	},
})

const nameRewriter = new HTMLRewriter()
nameRewriter.on('*', {
	element(el) {
		el.removeAndKeepContent()
	},
})
