// https://docs.joinmastodon.org/methods/statuses/#get

import { urlToHandle } from 'wildebeest/utils/handle'
import { parseHandle } from 'wildebeest/utils/parse'
import type { Person } from 'wildebeest/activitypub/actors'
import type { ContextData } from 'wildebeest/types/context'
import { getFollowers } from 'wildebeest/activitypub/actors/follow'
import { toMastodonStatus } from 'wildebeest/mastodon/status'
import type { Env } from 'wildebeest/types/env'
import { getObjectById } from 'wildebeest/activitypub/objects'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, request, env, data }) => {
	return handleRequest(env.DATABASE, params.id as string)
}

export async function handleRequest(db: D1Database, id: string): Promise<Response> {
	const obj = await getObjectById(db, id)
	if (obj === null) {
		return new Response('', { status: 404 })
	}
	const status = await toMastodonStatus(db, obj)
	if (!status) {
		return new Response('', { status: 404 })
	}

	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
	}
	return new Response(JSON.stringify(status), { headers })
}
