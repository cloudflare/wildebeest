import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import type { Cache } from 'wildebeest/backend/src/cache'
import { cacheFromEnv } from 'wildebeest/backend/src/cache'

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequest(request, cacheFromEnv(env), data.connectedActor)
}

export async function handleRequest(request: Request, cache: Cache, actor: Actor): Promise<Response> {
	const url = new URL(request.url)
	if (url.searchParams.has('max_id')) {
		// We just return the pregenerated notifications, without any filter for
		// pagination. Return an empty array to avoid duplicating notifications
		// in the app.
		return new Response(JSON.stringify([]), { headers })
	}

	const timeline = await cache.get<any>(actor.id + '/timeline/home')
	if (timeline === null) {
		return new Response(JSON.stringify([]), { headers })
	}
	return new Response(JSON.stringify(timeline), { headers })
}
