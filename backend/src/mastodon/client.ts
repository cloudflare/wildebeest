export interface Client {
	id: string
	secret: string
	name: string
	redirect_uris: string
	website: string
	scopes: string
	cdate: Date
}

export async function createClient(
	db: D1Database,
	name: string,
	redirect_uris: string,
	website: string,
	scopes: string
): Promise<Client> {
	const id = crypto.randomUUID()
	const secret = crypto.randomUUID()

	const query = `
          INSERT INTO clients (id, secret, name, redirect_uris, website, scopes)
          VALUES (?, ?, ?, ?, ?, ?)
		  RETURNING cdate
`
	const row: any = await db.prepare(query).bind(id, secret, name, redirect_uris, website, scopes).first()

	return {
		id: id,
		secret: secret,
		name: name,
		redirect_uris: redirect_uris,
		website: website,
		scopes: scopes,
		cdate: row.cdate,
	}
}

export async function getClientById(db: D1Database, id: string): Promise<Client | null> {
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
		cdate: row.cdate,
	}
}
