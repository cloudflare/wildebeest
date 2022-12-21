// https://docs.joinmastodon.org/methods/statuses/#get

import { urlToHandle } from 'wildebeest/utils/handle'
import { parseHandle } from 'wildebeest/utils/parse'
import type { Person } from 'wildebeest/activitypub/actors'
import type { ContextData } from 'wildebeest/types/context'
import { getFollowers } from 'wildebeest/activitypub/actors/follow'
import { getMastodonStatusById } from 'wildebeest/mastodon/status'
import type { Env } from 'wildebeest/types/env'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, request, env, data }) => {
	return handleRequest(env.DATABASE, params.id as string)
}

export async function handleRequest(db: D1Database, id: string): Promise<Response> {
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
