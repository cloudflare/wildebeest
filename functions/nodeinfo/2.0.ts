import type { Env } from 'wildebeest/backend/src/types/env'
import { WILDEBEEST_VERSION } from 'wildebeest/config/versions'
import { cors } from 'wildebeest/backend/src/utils/cors'

const headers = {
	...cors(),
	'content-type': 'application/json',
	'cache-control': 'max-age=259200, public',
}

export const onRequest: PagesFunction<Env, any> = async () => {
	return handleRequest()
}

export async function handleRequest(): Promise<Response> {
	const res = {
		version: '2.0',
		software: { name: 'wildebeest', version: WILDEBEEST_VERSION },
		protocols: ['activitypub'],
		services: { outbound: [], inbound: [] },
		usage: { users: {} },
		openRegistrations: false,
		metadata: {},
	}

	return new Response(JSON.stringify(res), { headers })
}
