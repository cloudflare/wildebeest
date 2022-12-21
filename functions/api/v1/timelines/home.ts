import type { Env } from 'wildebeest/types/env'
import type { ContextData } from 'wildebeest/types/context'
import type { Actor } from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import { urlToHandle } from 'wildebeest/utils/handle'
import { getHomeTimeline } from 'wildebeest/mastodon/timeline'
import { getPersonById } from 'wildebeest/activitypub/actors'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	return handleRequest(env.DATABASE, data.connectedActor)
}

export async function handleRequest(db: D1Database, connectedActor: Actor): Promise<Response> {
	const statuses = await getHomeTimeline(db, connectedActor)
	return new Response(JSON.stringify(statuses), { headers })
}
