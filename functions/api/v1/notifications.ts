// https://docs.joinmastodon.org/methods/notifications/#get

import type { Env } from 'wildebeest/backend/src/types/env'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequest(request, env.KV_CACHE, data.connectedActor)
}

const headers = {
	'content-type': 'application/json; charset=utf-8',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
}

export async function handleRequest(request: Request, cache: KVNamespace, connectedActor: Person): Promise<Response> {
	const url = new URL(request.url)
	if (url.searchParams.has('max_id')) {
		// We just return the pregenerated notifications, without any filter for
		// pagination. Return an empty array to avoid duplicating notifications
		// in the app.
		return new Response(JSON.stringify([]), { headers })
	}

	const notifications = await cache.get(connectedActor.id + '/notifications')
	if (notifications === null) {
		return new Response(JSON.stringify([]), { headers })
	}
	return new Response(notifications, { headers })
}
