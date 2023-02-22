import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import * as timelines from 'wildebeest/backend/src/mastodon/timeline'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(await getDatabase(env), request, domain, params.tag as string)
}

export async function handleRequest(db: Database, request: Request, domain: string, tag: string): Promise<Response> {
	const url = new URL(request.url)
	if (url.searchParams.has('max_id')) {
		return new Response(JSON.stringify([]), { headers })
	}

	const timeline = await timelines.getPublicTimeline(domain, db, timelines.LocalPreference.NotSet, 0, tag)
	return new Response(JSON.stringify(timeline), { headers })
}
