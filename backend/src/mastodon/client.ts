import { arrayBufferToBase64 } from 'wildebeest/backend/src/utils/key-ops'
import { type Database } from 'wildebeest/backend/src/database'

export interface Client {
	id: string
	secret: string
	name: string
	redirect_uris: string
	scopes: string
	website?: string
}

export async function createClient(
	db: Database,
	name: string,
	redirect_uris: string,
	scopes: string,
	website?: string
): Promise<Client> {
	const id = crypto.randomUUID()

	const secretBytes = new Uint8Array(64)
	crypto.getRandomValues(secretBytes)

	const secret = arrayBufferToBase64(secretBytes.buffer)

	const query = `
          INSERT INTO clients (id, secret, name, redirect_uris, website, scopes)
          VALUES (?, ?, ?, ?, ?, ?)
    `
	const { success, error } = await db
		.prepare(query)
		.bind(id, secret, name, redirect_uris, website === undefined ? null : website, scopes)
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	return {
		id: id,
		secret: secret,
		name: name,
		redirect_uris: redirect_uris,
		website: website,
		scopes: scopes,
	}
}

export async function getClientById(db: Database, id: string): Promise<Client | null> {
	const stmt = db.prepare('SELECT * FROM clients WHERE id=?').bind(id)
	const { results } = await stmt.all()
	if (!results || results.length === 0) {
		return null
	}
	const row: any = results[0]
	return {
		id: id,
		secret: row.secret,
		name: row.name,
		redirect_uris: row.redirect_uris,
		website: row.website,
		scopes: row.scopes,
	}
}
