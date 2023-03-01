import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { Person, personFromRow } from 'wildebeest/backend/src/activitypub/actors'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ env }) => {
	return handleRequestGet(await getDatabase(env))
}

export async function handleRequestGet(db: Database) {
	const admins = await getAdmins(db)
	return new Response(JSON.stringify(admins), { status: 200 })
}

export async function getAdmins(db: Database): Promise<Person[]> {
	let rows: unknown[] = []
	try {
		const stmt = db.prepare('SELECT * FROM actors WHERE is_admin=TRUE')
		const result = await stmt.all<unknown>()
		rows = result.success ? (result.results as unknown[]) : []
	} catch {
		/* empty */
	}

	return rows.map(personFromRow)
}
