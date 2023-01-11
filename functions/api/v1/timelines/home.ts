import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import * as errors from 'wildebeest/backend/src/errors'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequest(request, env.KV_CACHE, data.connectedActor)
}

export async function handleRequest(request: Request, cache: KVNamespace, actor: Actor): Promise<Response> {
	const url = new URL(request.url)
	if (url.searchParams.has('max_id')) {
		// We just return the pregenerated notifications, without any filter for
		// pagination. Return an empty array to avoid duplicating notifications
		// in the app.
		return new Response(JSON.stringify([]), { headers })
	}

	const timeline = await cache.get(actor.id + '/timeline/home')
	if (timeline === null) {
		return errors.timelineMissing()
	}
	return new Response(timeline, { headers })
}
