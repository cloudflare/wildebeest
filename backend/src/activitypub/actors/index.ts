import { defaultImages } from 'wildebeest/config/accounts'
import { generateUserKey } from 'wildebeest/backend/src/utils/key-ops'
import { type APObject, sanitizeContent, getTextContent } from '../objects'
import { addPeer } from 'wildebeest/backend/src/activitypub/peers'
import { type Database } from 'wildebeest/backend/src/database'
import { Buffer } from 'buffer'

const PERSON = 'Person'
const isTesting = typeof jest !== 'undefined'
export const emailSymbol = Symbol()
export const isAdminSymbol = Symbol()

export function actorURL(domain: string, id: string): URL {
	return new URL(`/ap/users/${id}`, 'https://' + domain)
}

// https://www.w3.org/TR/activitystreams-vocabulary/#actor-types
export interface Actor extends APObject {
	inbox: URL
	outbox: URL
	following: URL
	followers: URL

	alsoKnownAs?: string

	[emailSymbol]: string
	[isAdminSymbol]: boolean
}

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-person
export interface Person extends Actor {
	publicKey: {
		id: string
		owner: URL
		publicKeyPem: string
	}
}

export async function get(url: string | URL): Promise<Actor> {
	const headers = {
		accept: 'application/activity+json',
	}
	const res = await fetch(url.toString(), { headers })
	if (!res.ok) {
		throw new Error(`${url} returned: ${res.status}`)
	}

	const data = await res.json<any>()
	const actor: Actor = { ...data }
	actor.id = new URL(actor.id)

	if (actor.summary) {
		actor.summary = await sanitizeContent(actor.summary)
		if (actor.summary.length > 500) {
			actor.summary = actor.summary.substring(0, 500)
		}
	}
	if (actor.name) {
		actor.name = await getTextContent(actor.name)
		if (actor.name.length > 30) {
			actor.name = actor.name.substring(0, 30)
		}
	}
	if (actor.preferredUsername) {
		actor.preferredUsername = await getTextContent(actor.preferredUsername)
		if (actor.preferredUsername.length > 30) {
			actor.preferredUsername = actor.preferredUsername.substring(0, 30)
		}
	}

	// This is mostly for testing where for convenience not all values
	// are provided.
	// TODO: eventually clean that to better match production.
	if (actor.inbox !== undefined) {
		actor.inbox = new URL(actor.inbox)
	}
	if (actor.following !== undefined) {
		actor.following = new URL(actor.following)
	}
	if (actor.followers !== undefined) {
		actor.followers = new URL(actor.followers)
	}
	if (actor.outbox !== undefined) {
		actor.outbox = new URL(actor.outbox)
	}

	return actor
}

// Get and cache the Actor locally
export async function getAndCache(url: URL, db: Database): Promise<Actor> {
	{
		const actor = await getActorById(db, url)
		if (actor !== null) {
			return actor
		}
	}

	const actor = await get(url)
	if (!actor.type || !actor.id) {
		throw new Error('missing fields on Actor')
	}

	const properties = actor

	const sql = `
  INSERT INTO actors (id, type, properties)
  VALUES (?, ?, ?)
  `

	const { success, error } = await db
		.prepare(sql)
		.bind(actor.id.toString(), actor.type, JSON.stringify(properties))
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	// Add peer
	{
		const domain = actor.id.host
		await addPeer(db, domain)
	}
	return actor
}

export async function getPersonByEmail(db: Database, email: string): Promise<Person | null> {
	const stmt = db.prepare('SELECT * FROM actors WHERE email=? AND type=?').bind(email, PERSON)
	const { results } = await stmt.all()
	if (!results || results.length === 0) {
		return null
	}
	const row: any = results[0]
	return personFromRow(row)
}

type PersonProperties = {
	name?: string
	summary?: string
	icon?: { url: string }
	image?: { url: string }
	preferredUsername?: string

	inbox?: string
	outbox?: string
	following?: string
	followers?: string
}

// Create a local user
export async function createPerson(
	domain: string,
	db: Database,
	userKEK: string,
	email: string,
	properties: PersonProperties = {},
	admin: boolean = false
): Promise<Person> {
	const userKeyPair = await generateUserKey(userKEK)

	let privkey, salt
	// Since D1 and better-sqlite3 behaviors don't exactly match, presumable
	// because Buffer support is different in Node/Worker. We have to transform
	// the values depending on the platform.
	if (isTesting || db.client === 'neon') {
		privkey = Buffer.from(userKeyPair.wrappedPrivKey)
		salt = Buffer.from(userKeyPair.salt)
	} else {
		privkey = [...new Uint8Array(userKeyPair.wrappedPrivKey)]
		salt = [...new Uint8Array(userKeyPair.salt)]
	}

	if (properties.preferredUsername === undefined) {
		const parts = email.split('@')
		properties.preferredUsername = parts[0]
	}

	if (properties.preferredUsername !== undefined && typeof properties.preferredUsername !== 'string') {
		throw new Error(
			`preferredUsername should be a string, received ${JSON.stringify(properties.preferredUsername)} instead`
		)
	}

	const id = actorURL(domain, properties.preferredUsername).toString()

	if (properties.inbox === undefined) {
		properties.inbox = id + '/inbox'
	}

	if (properties.outbox === undefined) {
		properties.outbox = id + '/outbox'
	}

	if (properties.following === undefined) {
		properties.following = id + '/following'
	}

	if (properties.followers === undefined) {
		properties.followers = id + '/followers'
	}

	const row = await db
		.prepare(
			`
              INSERT INTO actors(id, type, email, pubkey, privkey, privkey_salt, properties, is_admin)
              VALUES(?, ?, ?, ?, ?, ?, ?, ?)
              RETURNING *
          `
		)
		.bind(id, PERSON, email, userKeyPair.pubKey, privkey, salt, JSON.stringify(properties), admin ? 1 : null)
		.first()

	return personFromRow(row)
}

export async function updateActorProperty(db: Database, actorId: URL, key: string, value: string) {
	const { success, error } = await db
		.prepare(`UPDATE actors SET properties=${db.qb.jsonSet('properties', key, '?1')} WHERE id=?2`)
		.bind(value, actorId.toString())
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

export async function setActorAlias(db: Database, actorId: URL, alias: URL) {
	if (db.client === 'neon') {
		const { success, error } = await db
			.prepare(`UPDATE actors SET properties=${db.qb.jsonSet('properties', 'alsoKnownAs,0', '?1')} WHERE id=?2`)
			.bind('"' + alias.toString() + '"', actorId.toString())
			.run()
		if (!success) {
			throw new Error('SQL error: ' + error)
		}
	} else {
		const { success, error } = await db
			.prepare(
				`UPDATE actors SET properties=${db.qb.jsonSet('properties', 'alsoKnownAs', 'json_array(?1)')} WHERE id=?2`
			)
			.bind(alias.toString(), actorId.toString())
			.run()
		if (!success) {
			throw new Error('SQL error: ' + error)
		}
	}
}

export async function getActorById(db: Database, id: URL): Promise<Actor | null> {
	const stmt = db.prepare('SELECT * FROM actors WHERE id=?').bind(id.toString())
	const { results } = await stmt.all()
	if (!results || results.length === 0) {
		return null
	}
	const row: any = results[0]
	return personFromRow(row)
}

export function personFromRow(row: any): Person {
	let properties
	if (typeof row.properties === 'object') {
		// neon uses JSONB for properties which is returned as a deserialized
		// object.
		properties = row.properties as PersonProperties
	} else {
		// D1 uses a string for JSON properties
		properties = JSON.parse(row.properties) as PersonProperties
	}

	const icon = properties.icon ?? {
		type: 'Image',
		mediaType: 'image/jpeg',
		url: new URL(defaultImages.avatar),
		id: new URL(row.id + '#icon'),
	}
	const image = properties.image ?? {
		type: 'Image',
		mediaType: 'image/jpeg',
		url: new URL(defaultImages.header),
		id: new URL(row.id + '#image'),
	}

	const preferredUsername = properties.preferredUsername
	const name = properties.name ?? preferredUsername

	let publicKey = null
	if (row.pubkey !== null) {
		publicKey = {
			id: row.id + '#main-key',
			owner: row.id,
			publicKeyPem: row.pubkey,
		}
	}

	const id = new URL(row.id)

	let domain = id.hostname
	if (row.original_actor_id) {
		domain = new URL(row.original_actor_id).hostname
	}

	// Old local actors weren't created with inbox/outbox/etc properties, so add
	// them if missing.
	{
		if (properties.inbox === undefined) {
			properties.inbox = id + '/inbox'
		}

		if (properties.outbox === undefined) {
			properties.outbox = id + '/outbox'
		}

		if (properties.following === undefined) {
			properties.following = id + '/following'
		}

		if (properties.followers === undefined) {
			properties.followers = id + '/followers'
		}
	}

	return {
		// Hidden values
		[emailSymbol]: row.email,
		[isAdminSymbol]: row.is_admin === 1,

		...properties,
		name,
		icon,
		image,
		preferredUsername,
		discoverable: true,
		publicKey,
		type: PERSON,
		id,
		published: new Date(row.cdate).toISOString(),

		url: new URL('@' + preferredUsername, 'https://' + domain),
	} as unknown as Person
}
