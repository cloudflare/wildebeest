import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { Actor, Person, personFromRow } from 'wildebeest/backend/src/activitypub/actors'
import { Result } from 'wildebeest/backend/src/database'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ env }) => {
	return handleRequestGet(await getDatabase(env))
}

export async function handleRequestGet(db: Database) {
	const admins = await getAdmins(db)
	return new Response(JSON.stringify(admins), { status: 200 })
}

export async function getAdmins(db: Database): Promise<Person[]> {
	const stmt = db.prepare('SELECT * FROM actors WHERE is_admin=1 ORDER BY cdate ASC')
	const queryResult: Result<Actor> = await stmt.all<Actor>()

	if (queryResult.success === false) {
		console.error(`SQL error encountered while retrieving server admin(s): ${queryResult.error}`)
		return Array<Person>()
	}

	const rows: Array<Actor> = (queryResult?.results as Actor[]) ?? []
	if (rows.length === 0) {
		console.warn('Server lacks an admin')
		return Array<Person>()
	}
	return rows.map(personFromRow)
}
