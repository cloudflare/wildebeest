import { defaultImages } from 'wildebeest/config/accounts'
import { generateUserKey } from 'wildebeest/backend/src/utils/key-ops'
import { type APObject, sanitizeContent, sanitizeName } from '../objects'

const PERSON = 'Person'
const isTesting = typeof jest !== 'undefined'
export const emailSymbol = Symbol()

export function actorURL(domain: string, id: string): URL {
	return new URL(`/ap/users/${id}`, 'https://' + domain)
}

function inboxURL(id: URL): URL {
	return new URL(id + '/inbox')
}

function outboxURL(id: URL): URL {
	return new URL(id + '/outbox')
}

function followingURL(id: URL): URL {
	return new URL(id + '/following')
}

export function followersURL(id: URL): URL {
	return new URL(id + '/followers')
}

// https://www.w3.org/TR/activitystreams-vocabulary/#actor-types
export interface Actor extends APObject {
	inbox: URL
	outbox: URL
	following: URL
	followers: URL

	[emailSymbol]: string
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
	actor.id = new URL(data.id)

	if (data.content) {
		actor.content = await sanitizeContent(data.content)
	}
	if (data.name) {
		actor.name = await sanitizeName(data.name)
	}
	if (data.preferredUsername) {
		actor.preferredUsername = await sanitizeName(data.preferredUsername)
	}

	// This is mostly for testing where for convenience not all values
	// are provided.
	// TODO: eventually clean that to better match production.
	if (data.inbox !== undefined) {
		actor.inbox = new URL(data.inbox)
	}
	if (data.following !== undefined) {
		actor.following = new URL(data.following)
	}
	if (data.followers !== undefined) {
		actor.followers = new URL(data.followers)
	}
	if (data.outbox !== undefined) {
		actor.outbox = new URL(data.outbox)
	}

	return actor
}

export async function getAndCache(url: URL, db: D1Database): Promise<Actor> {
	const person = await getPersonById(db, url)
	if (person !== null) {
		return person
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
	return actor
}

export async function getPersonByEmail(db: D1Database, email: string): Promise<Person | null> {
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
}

export async function createPerson(
	domain: string,
	db: D1Database,
	userKEK: string,
	email: string,
	properties: PersonProperties = {}
): Promise<Person> {
	const userKeyPair = await generateUserKey(userKEK)

	let privkey, salt
	// Since D1 and better-sqlite3 behaviors don't exactly match, presumable
	// because Buffer support is different in Node/Worker. We have to transform
	// the values depending on the platform.
	if (isTesting) {
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
	const row = await db
		.prepare(
			`
              INSERT INTO actors(id, type, email, pubkey, privkey, privkey_salt, properties)
              VALUES(?, ?, ?, ?, ?, ?, ?)
              RETURNING *
          `
		)
		.bind(id, PERSON, email, userKeyPair.pubKey, privkey, salt, JSON.stringify(properties))
		.first()

	return personFromRow(row)
}

export async function updateActorProperty(db: D1Database, actorId: URL, key: string, value: string) {
	const { success, error } = await db
		.prepare(`UPDATE actors SET properties=json_set(properties, '$.${key}', ?) WHERE id=?`)
		.bind(value, actorId.toString())
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

export async function getPersonById(db: D1Database, id: URL): Promise<Person | null> {
	const stmt = db.prepare('SELECT * FROM actors WHERE id=? AND type=?').bind(id.toString(), PERSON)
	const { results } = await stmt.all()
	if (!results || results.length === 0) {
		return null
	}
	const row: any = results[0]
	return personFromRow(row)
}

export function personFromRow(row: any): Person {
	const properties = JSON.parse(row.properties) as PersonProperties
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

	return {
		// Hidden values
		[emailSymbol]: row.email,

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
		inbox: inboxURL(row.id),
		outbox: outboxURL(row.id),
		following: followingURL(row.id),
		followers: followersURL(row.id),

		url: new URL('@' + preferredUsername, 'https://' + domain),
	} as Person
}
