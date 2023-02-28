import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import * as timelines from 'wildebeest/backend/src/mastodon/timeline'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { getDomain } from 'wildebeest/backend/src/utils/getDomain'

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	const url = new URL(request.url)
	const { searchParams } = url
	const offset = Number.parseInt(searchParams.get('offset') ?? '0')
	return handleRequest(await getDatabase(env), request, getDomain(url), params.tag as string, offset)
}

export async function handleRequest(
	db: Database,
	request: Request,
	domain: string,
	tag: string,
	offset = 0
): Promise<Response> {
	const url = new URL(request.url)
	if (url.searchParams.has('max_id')) {
		return new Response(JSON.stringify([]), { headers })
	}

	const timeline = await timelines.getPublicTimeline(domain, db, timelines.LocalPreference.NotSet, offset, tag)
	return new Response(JSON.stringify(timeline), { headers })
}
