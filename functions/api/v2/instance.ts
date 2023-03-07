import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { DEFAULT_THUMBNAIL } from 'wildebeest/backend/src/config'
import type { InstanceConfigV2 } from 'wildebeest/backend/src/types/configs'
import { getFederationUA } from 'wildebeest/config/ua'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequest: PagesFunction<Env, any> = async ({ env, request }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, await getDatabase(env), env)
}

export async function handleRequest(domain: string, db: Database, env: Env) {
	// prettier-ignore
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		...cors()
	}

	const res: InstanceConfigV2 = {
		domain,
		title: env.INSTANCE_TITLE,
		version: getFederationUA(domain),
		source_url: 'https://github.com/cloudflare/wildebeest',
		description: env.INSTANCE_DESCR,
		thumbnail: {
			url: DEFAULT_THUMBNAIL,
		},
		languages: ['en'],
		registrations: {
			// Registration is disabled because unsupported by Wildebeest. Users
			// should go through the login flow and authenticate with Access.
			enabled: false,
		},
		contact: {
			email: env.ADMIN_EMAIL,
		},
		rules: [],
	}

	return new Response(JSON.stringify(res), { headers })
}
