import type { Env } from 'wildebeest/backend/src/types/env'
import type { InstanceConfigV2 } from 'wildebeest/backend/src/types/configs'

const INSTANCE_VERSION = '4.0.2'

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

	const config: any = {}
	if (results) {
		for (let i = 0, len = results.length; i < len; i++) {
			const row: any = results[i]
			config[row.key] = row.value
		}
	}

	const res: InstanceConfigV2 = {
		domain,
		title: config.title,
		version: INSTANCE_VERSION,
		source_url: 'https://github.com/cloudflare/wildebeest',
		description: config.description,
		thumbnail: {
			url: config.thumbnail,
		},
		languages: ['en'],
		registrations: {
			// Registration is disabled because unsupported by Wildebeest. Users
			// should go through the login flow and authenticate with Access.
			enabled: false,
		},
		contact: {
			email: config.email,
		},
		rules: [],
	}

	return new Response(JSON.stringify(res), { headers })
}
