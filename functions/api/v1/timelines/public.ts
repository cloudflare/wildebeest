import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import * as objects from 'wildebeest/backend/src/activitypub/objects/'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { getPublicTimeline } from 'wildebeest/backend/src/mastodon/timeline'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/backend/src/types/'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	return handleRequest(env.DATABASE)
}

export async function handleRequest(db: D1Database): Promise<Response> {
	const statuses = await getPublicTimeline(db)
	return new Response(JSON.stringify(statuses), { headers })
}
