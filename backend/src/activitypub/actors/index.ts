import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { defaultImages } from 'wildebeest/config/accounts'
import { instanceConfig } from 'wildebeest/config/instance'
import { generateUserKey } from 'wildebeest/backend/src/utils/key-ops'
import type { Object } from '../objects'

const PERSON = 'Person'
const isTesting = typeof jest !== 'undefined'

export function actorURL(id: string): URL {
	return new URL(`/ap/users/${id}`, 'https://' + instanceConfig.uri)
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
export interface Actor extends Object {
	inbox: URL
	outbox: URL
	following: URL
	followers: URL
}

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-person
export interface Person extends Actor {
	publicKey: string
}

export async function get(url: string | URL): Promise<Actor> {
	const headers = {
		accept: 'application/activity+json',
	}
	const res = await fetch(url, { headers })
	if (!res.ok) {
		throw new Error(`${url} returned: ${res.status}`)
	}

	return res.json<Actor>()
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

	const { success, error } = await db.prepare(sql).bind(actor.id, actor.type, JSON.stringify(properties)).run()
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

export async function createPerson(
	db: D1Database,
	userKEK: string,
	email: string,
	properties: any = {}
): Promise<string> {
	const parts = email.split('@')
	const id = actorURL(parts[0]).toString()
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

	properties.preferredUsername = parts[0]

	const { success, error } = await db
		.prepare(
			'INSERT INTO actors(id, type, email, pubkey, privkey, privkey_salt, properties) VALUES(?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(id, PERSON, email, userKeyPair.pubKey, privkey, salt, JSON.stringify(properties))
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	return id
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

function personFromRow(row: any): Person {
	const icon: Object = {
		type: 'Image',
		mediaType: 'image/jpeg',
		url: new URL(defaultImages.avatar),
		id: row.id + '#icon',
	}
	const image: Object = {
		type: 'Image',
		mediaType: 'image/jpeg',
		url: new URL(defaultImages.header),
		id: row.id + '#image',
	}

	let publicKey = null
	if (row.pubkey !== null) {
		publicKey = {
			id: row.id + '#main-key',
			owner: row.id,
			publicKeyPem: row.pubkey,
		}
	}

	return {
		// Default values, likely being overrided by the properties.
		name: row.preferredUsername,
		icon,
		image,
		discoverable: true,
		publicKey,
		type: PERSON,
		id: row.id,
		published: new Date(row.cdate).toISOString(),
		inbox: inboxURL(row.id),
		outbox: outboxURL(row.id),
		following: followingURL(row.id),
		followers: followersURL(row.id),

		// FIXME: stub
		url: 'https://social.eng.chat/@todo',

		...JSON.parse(row.properties),
	}
}