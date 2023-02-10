import { getResultsField } from 'wildebeest/backend/src/mastodon/utils'

export async function getPeers(db: D1Database): Promise<Array<String>> {
	const query = `SELECT domain FROM peers `
	const statement = db.prepare(query)

	return getResultsField(statement, 'domain')
}

export async function addPeer(db: D1Database, domain: string): Promise<void> {
	const query = `
		INSERT OR IGNORE INTO peers (domain)
		VALUES (?)
	`

	const out = await db.prepare(query).bind(domain).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}
