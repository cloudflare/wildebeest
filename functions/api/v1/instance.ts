import type { Env } from 'wildebeest/backend/src/types/env'

export const INSTANCE_VERSION = '0.0.0'
export const COMPAT_VERSION = '4.0.2'

export const onRequest: PagesFunction<Env, any> = async ({ env, request }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, env.DATABASE)
}

export async function handleRequest(domain: string, db: D1Database) {
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'content-type': 'application/json; charset=utf-8',
	}

	const query = `
        SELECT * FROM instance_config WHERE key IN ('title', 'description', 'email', 'short_description', 'thumbnail')
    `
	const { results, error, success } = await db.prepare(query).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	const res: any = {}
	if (results) {
		for (let i = 0, len = results.length; i < len; i++) {
			const row: any = results[i]
			res[row.key] = row.value
		}
	}

	// Registration is disabled because unsupported by Wildebeest. Users
	// should go through the login flow and authenticate with Access.
	// The documentation is incorrect and registrations is a boolean.
	res.registrations = false
	res.version = `${COMPAT_VERSION} (compatible; Wildebeest ${INSTANCE_VERSION})`
	res.rules = []
	res.uri = domain

	if (!res.short_description) {
		res.short_description = res.description
	}

	return new Response(JSON.stringify(res), { headers })
}
