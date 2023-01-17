// https://docs.joinmastodon.org/methods/statuses/#get

import { cors } from 'wildebeest/backend/src/utils/cors'
import type { UUID } from 'wildebeest/backend/src/types'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getMastodonStatusById } from 'wildebeest/backend/src/mastodon/status'
import type { Env } from 'wildebeest/backend/src/types/env'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, env, request }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(env.DATABASE, params.id as UUID, domain)
}

export async function handleRequest(db: D1Database, id: UUID, domain: string): Promise<Response> {
	const status = await getMastodonStatusById(db, id, domain)
	if (status === null) {
		return new Response('', { status: 404 })
	}

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(status), { headers })
}
