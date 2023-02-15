import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'

const headers = {
	...cors(),
	'content-type': 'application/json',
	'cache-control': 'max-age=259200, public',
}

export const onRequest: PagesFunction<Env, any> = async ({ env }) => {
	return handleRequest(env.DOMAIN)
}

export async function handleRequest(domain: string): Promise<Response> {
	const res = {
		links: [
			{
				rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0',
				href: `https://${domain}/nodeinfo/2.0`,
			},
			{
				rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
				href: `https://${domain}/nodeinfo/2.1`,
			},
		],
	}

	return new Response(JSON.stringify(res), { headers })
}
