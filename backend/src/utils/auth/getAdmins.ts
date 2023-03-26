import { type Database } from 'wildebeest/backend/src/database'
import { Person, personFromRow } from 'wildebeest/backend/src/activitypub/actors'

export async function getAdmins(db: Database): Promise<Person[]> {
	let rows: unknown[] = []
	try {
		const stmt = db.prepare('SELECT * FROM actors WHERE is_admin=1')
		const result = await stmt.all<unknown>()
		rows = result.success ? (result.results as unknown[]) : []
	} catch {
		/* empty */
	}

	return rows.map(personFromRow)
}
