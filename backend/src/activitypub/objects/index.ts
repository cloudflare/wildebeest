import type { UUID } from 'wildebeest/backend/src/types'
import { addPeer } from 'wildebeest/backend/src/activitypub/peers'
import { type Database } from 'wildebeest/backend/src/database'

export const originalActorIdSymbol = Symbol()
export const originalObjectIdSymbol = Symbol()
export const mastodonIdSymbol = Symbol()

// https://www.w3.org/TR/activitystreams-vocabulary/#object-types
export interface APObject {
	type: string
	// ObjectId, URL used for federation. Called `uri` in Mastodon APIs.
	// https://www.w3.org/TR/activitypub/#obj-id
	id: URL
	// Link to the HTML representation of the object
	url: URL
	published?: string
	icon?: APObject
	image?: APObject
	summary?: string
	name?: string
	mediaType?: string
	content?: string
	inReplyTo?: string

	// Extension
	preferredUsername?: string
	// Internal
	[originalActorIdSymbol]?: string
	[originalObjectIdSymbol]?: string
	[mastodonIdSymbol]?: UUID
}

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-document
export interface Document extends APObject {}

export function uri(domain: string, id: string): URL {
	return new URL('/ap/o/' + id, 'https://' + domain)
}

export async function createObject<Type extends APObject>(
	domain: string,
	db: Database,
	type: string,
	properties: any,
	originalActorId: URL,
	local: boolean
): Promise<Type> {
	const uuid = crypto.randomUUID()
	const apId = uri(domain, uuid).toString()
	const sanitizedProperties = await sanitizeObjectProperties(properties)
	const insertQuery = `
					INSERT INTO objects(id, type, properties, original_actor_id, local, mastodon_id) 
					VALUES(?, ?, ?, ?, ?, ?)
					RETURNING *
	;`
	try {
		await db
			.prepare(insertQuery)
			.bind(apId, type, JSON.stringify(sanitizedProperties), originalActorId.toString(), local ? 1 : 0, uuid)
			.run()
	} catch (e: any) {
		const message: string = `Unable to create '${type}' object due to SQL error: ${e.message}\n${
			e.cause?.message ?? e.cause
		}\nid, type, properties, original_actor_id, local, uuid = ${apId}, ${type}, ${JSON.stringify(
			sanitizedProperties
		)}, ${originalActorId.toString()}, ${local ? 1 : 0}, ${uuid}`
		console.error(message)
		throw Error(message)
	}

	const searchQueryResults = await db
		.prepare('SELECT cdate FROM objects WHERE id=?;')
		.bind(apId)
		.first<{ cdate: string }>()
	// prettier-ignore
	const santitizedObject = {
		published: new Date(searchQueryResults.cdate).toISOString(),
		[mastodonIdSymbol]: uuid,
		[originalActorIdSymbol]: originalActorId.toString(),
		...sanitizedProperties
	}
	santitizedObject.type = type
	santitizedObject.id = new URL(apId)
	// console.info(`\ntype = ${type}\nnew URL(apId) = ${new URL(apId).toString()}`)
	// console.info(`santitizedObject = ${JSON.stringify(santitizedObject, null, 2)}`)

	return santitizedObject as Type
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
	object: APObject
}

export async function cacheObject(
	domain: string,
	db: Database,
	properties: unknown,
	originalActorId: URL,
	originalObjectId: URL,
	local: boolean
): Promise<CacheObjectRes> {
	const sanitizedProperties = await sanitizeObjectProperties(properties)

	const cachedObject = await getObjectBy(db, ObjectByKey.originalObjectId, originalObjectId.toString())
	if (cachedObject !== null) {
		return {
			created: false,
			object: cachedObject,
		}
	}

	const uuid = crypto.randomUUID()
	const apId = uri(domain, uuid).toString()

	await db
		.prepare(
			'INSERT INTO objects(id, type, properties, original_actor_id, original_object_id, local, mastodon_id) VALUES(?, ?, ?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(
			apId,
			sanitizedProperties.type,
			JSON.stringify(sanitizedProperties),
			originalActorId.toString(),
			originalObjectId.toString(),
			local ? 1 : 0,
			uuid
		)
		.run()

	const searchQueryResults = await db
		.prepare('SELECT cdate FROM objects WHERE id=?;')
		.bind(apId)
		.first<{ cdate: string }>()

	// Add peer
	{
		const domain = originalObjectId.host
		await addPeer(db, domain)
	}

	{
		// prettier-ignore
		const retrievedFederatedObject = {
			published: new Date(searchQueryResults.cdate).toISOString(),

			[mastodonIdSymbol]: uuid,
			[originalActorIdSymbol]: originalActorId.toString(),
			[originalObjectIdSymbol]: originalObjectId.toString(),

			...sanitizedProperties
		} as APObject
		retrievedFederatedObject.id = new URL(apId)
		retrievedFederatedObject.type = sanitizedProperties.type

		return { object: retrievedFederatedObject, created: true }
	}
}

export async function updateObject(db: Database, properties: any, id: URL): Promise<boolean> {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const res: any = await db
		.prepare('UPDATE objects SET properties = ? WHERE id = ?')
		.bind(JSON.stringify(properties), id.toString())
		.run()

	// TODO: D1 doesn't return changes at the moment
	// return res.changes === 1
	return true
}

export async function updateObjectProperty(db: Database, obj: APObject, key: string, value: string) {
	const { success, error } = await db
		.prepare(`UPDATE objects SET properties=json_set(properties, '$.${key}', ?) WHERE id=?`)
		.bind(value, obj.id.toString())
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

async function _getObjectByIdType(db: Database, id: string | URL, idType: ObjectByKey): Promise<APObject | null> {
	if (typeof id === 'object') {
		const apObject: APObject | null = await getObjectBy(db, idType, id.toString())
		// prettier-ignore
		console.debug(`_getObjectByIdType | idType = ${idType} | id = ${id.toString()} | apObject = ${JSON.stringify((apObject ?? { result: 'NOT FOUND' }), null, 2)}`)
		return apObject
	} else {
		const apObject: APObject | null = await getObjectBy(db, idType, id)
		// prettier-ignore
		console.debug(`_getObjectByIdType | idType = ${idType} | id = ${id} | apObject = ${JSON.stringify((apObject ?? { result: 'NOT FOUND' }), null, 2)}`)
		return apObject
	}
}

export async function getObjectById(db: Database, id: string | URL): Promise<APObject | null> {
	return await _getObjectByIdType(db, id, ObjectByKey.id)
}

export async function getObjectByOriginalId(db: Database, id: string | URL): Promise<APObject | null> {
	return await _getObjectByIdType(db, id, ObjectByKey.originalObjectId)
}

export async function getObjectByMastodonId(db: Database, id: UUID): Promise<APObject | null> {
	return await _getObjectByIdType(db, id, ObjectByKey.mastodonId)
}

export enum ObjectByKey {
	id = 'id',
	originalObjectId = 'original_object_id',
	mastodonId = 'mastodon_id',
}

const allowedObjectByKeysSet = new Set(Object.values(ObjectByKey))

export async function getObjectBy(db: Database, key: ObjectByKey, value: string) {
	if (!allowedObjectByKeysSet.has(key)) {
		throw new Error('getObjectBy run with invalid key: ' + key)
	}
	const query = `
		SELECT *
		FROM objects
		WHERE 
			objects.${key}=?
		ORDER BY cdate DESC
		LIMIT 1
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

	// prettier-ignore
	const localObject = {
		published: new Date(result.cdate).toISOString(),

		type: result.type,
		id: new URL(result.id),

		[mastodonIdSymbol]: result.mastodon_id,
		[originalActorIdSymbol]: result.original_actor_id,
		[originalObjectIdSymbol]: result.original_object_id,
		...properties
	} as APObject

	// console.trace(`\nresult.type = ${result.type}\nresult.id = ${result.id}\nlocalObject.type = ${localObject.type}\nlocalObject.id = ${localObject.id}\nproperties = ${JSON.stringify(properties, null, 2)}`)

	;(localObject.type = result.type), (localObject.id = new URL(result.id))

	// console.trace(`\nresult.type = ${result.type}\nresult.id = ${result.id}\nlocalObject.type = ${localObject.type}\nlocalObject.id = ${localObject.id}\nproperties = ${JSON.stringify(properties, null, 2)}`)

	// console.info(`localObject = ${JSON.stringify(localObject, null, 2)}`)
	return localObject as APObject
}

/** Is the given `value` an ActivityPub Object? */
export function isAPObject(value: unknown): value is APObject {
	return value !== null && typeof value === 'object'
}

/** Sanitizes the ActivityPub Object `properties` prior to being stored in the DB. */
export async function sanitizeObjectProperties(properties: unknown): Promise<APObject> {
	if (!isAPObject(properties)) {
		throw new Error('Invalid object properties. Expected an object but got ' + JSON.stringify(properties))
	}

	// prettier-ignore
	const sanitized: APObject = {
		...properties
	}

	if ('content' in properties) {
		sanitized.content = await sanitizeContent(properties.content as string)
	}
	if ('name' in properties) {
		sanitized.name = await getTextContent(properties.name as string)
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
	return await getContentRewriter().transform(new Response(unsafeContent)).text()
}

/**
 * This method removes all HTML elements from the string leaving only the text content.
 */
export async function getTextContent(unsafeName: string): Promise<string> {
	const rawContent = getTextContentRewriter().transform(new Response(unsafeName))
	const text = await rawContent.text()
	return text.trim()
}

function getContentRewriter() {
	const contentRewriter = new HTMLRewriter()
	contentRewriter.on('*', {
		element(el) {
			if (!['p', 'span', 'br', 'a'].includes(el.tagName)) {
				const element = el as { tagName: string }
				element.tagName = 'p'
			}

			if (el.hasAttribute('class')) {
				const classes = el.getAttribute('class')!.split(/\s+/)
				const sanitizedClasses = classes.filter((c) =>
					/^(h|p|u|dt|e)-|^mention$|^hashtag$|^ellipsis$|^invisible$/.test(c)
				)
				el.setAttribute('class', sanitizedClasses.join(' '))
			}
		},
	})
	return contentRewriter
}

function getTextContentRewriter() {
	const textContentRewriter = new HTMLRewriter()
	textContentRewriter.on('*', {
		element(el) {
			el.removeAndKeepContent()
			if (['p', 'br'].includes(el.tagName)) {
				el.after(' ')
			}
		},
	})
	return textContentRewriter
}

// TODO: eventually use SQLite's `ON DELETE CASCADE` but requires writing the DB
// schema directly into D1, which D1 disallows at the moment.
// Some context at: https://stackoverflow.com/questions/13150075/add-on-delete-cascade-behavior-to-an-sqlite3-table-after-it-has-been-created
export async function deleteObject<T extends APObject>(db: Database, note: T): Promise<string> {
	const nodeId = note.id.toString()
	const batch = [
		db.prepare('DELETE FROM outbox_objects WHERE object_id=?').bind(nodeId),
		db.prepare('DELETE FROM inbox_objects WHERE object_id=?').bind(nodeId),
		db.prepare('DELETE FROM actor_notifications WHERE object_id=?').bind(nodeId),
		db.prepare('DELETE FROM actor_favourites WHERE object_id=?').bind(nodeId),
		db.prepare('DELETE FROM actor_reblogs WHERE object_id=?').bind(nodeId),
		db.prepare('DELETE FROM actor_replies WHERE object_id=?1 OR in_reply_to_object_id=?1').bind(nodeId),
		db.prepare('DELETE FROM idempotency_keys WHERE object_id=?').bind(nodeId),
		db.prepare('DELETE FROM note_hashtags WHERE object_id=?').bind(nodeId),
		db.prepare('DELETE FROM objects WHERE id=?').bind(nodeId),
	]

	const res = await db.batch(batch)

	for (let i = 0, len = res.length; i < len; i++) {
		if (!res[i].success) {
			const message: string = `SQL error: ${res[i].error}`
			console.error(message)
			return message
		}
	}
	return 'success'
}
