import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getPublicTimeline } from 'wildebeest/backend/src/mastodon/timeline'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	const { searchParams } = new URL(request.url)
	const local = Boolean(searchParams.get('local') ?? 'false')
	const remote = Boolean(searchParams.get('remote') ?? 'false')
	const only_media = Boolean(searchParams.get('only_media') ?? 'false')
	return handleRequest(env.DATABASE, { local, remote, only_media })
}

export async function handleRequest(
	db: D1Database,
	{ local = false, remote = false, only_media = false } = {}
): Promise<Response> {
	// TODO - use the options in the query
	const statuses = await getPublicTimeline(db)
	return new Response(JSON.stringify(statuses), { headers })
}
