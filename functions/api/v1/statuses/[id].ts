// https://docs.joinmastodon.org/methods/statuses/#get

import type { UUID } from 'wildebeest/backend/src/types'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getMastodonStatusById } from 'wildebeest/backend/src/mastodon/status'
import type { Env } from 'wildebeest/backend/src/types/env'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, env }) => {
	return handleRequest(env.DATABASE, params.id as UUID)
}

export async function handleRequest(db: D1Database, id: UUID): Promise<Response> {
	const status = await getMastodonStatusById(db, id)
	if (status === null) {
		return new Response('', { status: 404 })
	}

	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
	}
	return new Response(JSON.stringify(status), { headers })
}
