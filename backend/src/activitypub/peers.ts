import { getResultsField } from 'wildebeest/backend/src/mastodon/utils'
import { type Database } from 'wildebeest/backend/src/database'

export async function getPeers(db: Database): Promise<Array<String>> {
	const query = `SELECT domain FROM peers `
	const statement = db.prepare(query)

	return getResultsField(statement, 'domain')
}

export async function addPeer(db: Database, domain: string): Promise<void> {
	try {
		const query = `
            INSERT INTO peers (domain)
            VALUES (?)
        `

		const out = await db.prepare(query).bind(domain).run()
		if (!out.success) {
			throw new Error('SQL error: ' + out.error)
		}
	} catch (err: any) {
        console.warn(err.stack);
		// handle peer already exists for psql
	}
}
