import { init } from './init'
import { type Database } from 'wildebeest/backend/src/database'

interface Env {
	DATABASE: Database
}

/**
 * A Cloudflare Worker that will run helpers against a D1 database to populate it with mock data.
 */
const handler: ExportedHandler<Env> = {
	async fetch(req, { DATABASE }) {
		const domain = new URL(req.url).hostname
		try {
			await init(domain, DATABASE)
			// eslint-disable-next-line no-console
			console.log('Database initialized.')
		} catch (e) {
			if (isD1ConstraintError(e)) {
				// eslint-disable-next-line no-console
				console.log('Database already initialized.')
			} else {
				throw e
			}
		}
		return new Response('OK')
	},
}

/**
 * Check whether the error is because of a SQL constraint,
 * which will indicate that the database was already populated.
 */
function isD1ConstraintError(e: unknown) {
	return (
		(e as { message: string }).message === 'D1_RUN_ERROR' &&
		(e as { cause?: { code: string } }).cause?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
	)
}

export default handler
