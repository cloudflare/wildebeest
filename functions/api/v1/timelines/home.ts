import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import * as objects from 'wildebeest/backend/src/activitypub/objects/'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { getHomeTimeline } from 'wildebeest/backend/src/mastodon/timeline'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/backend/src/types/'
import * as errors from 'wildebeest/backend/src/errors'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	return handleRequest(env.KV_CACHE, data.connectedActor)
}

export async function handleRequest(cache: KVNamespace, actor: Actor): Promise<Response> {
	const timeline = await cache.get(actor.id + '/timeline/home')
	if (timeline === null) {
		return errors.timelineMissing()
	}
	return new Response(timeline, { headers })
}
