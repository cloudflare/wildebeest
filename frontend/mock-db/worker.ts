import { init } from './init'

interface Env {
	DATABASE: D1Database
}

/**
 * A Cloudflare Worker that will run helpers against a D1 database to populate it with mock data.
 */
const handler: ExportedHandler<Env> = {
	async fetch(req, { DATABASE }) {
		const domain = new URL(req.url).hostname
		try {
			await init(domain, DATABASE)
			console.log('Database initialized.')
		} catch (e) {
			if (isD1ConstraintError(e)) {
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
	return (e as any).message === 'D1_RUN_ERROR' && (e as any).cause?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
}

export default handler
