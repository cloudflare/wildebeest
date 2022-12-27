import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getPublicTimeline, LocalPreference } from 'wildebeest/backend/src/mastodon/timeline'

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
	const domain = new URL(request.url).hostname
	return handleRequest(domain, env.DATABASE, { local, remote, only_media })
}

export async function handleRequest(
	domain: string,
	db: D1Database,
	{ local = false, remote = false, only_media = false } = {}
): Promise<Response> {
	let localParam = LocalPreference.NotSet
	if (local) {
		localParam = LocalPreference.OnlyLocal
	} else if (remote) {
		localParam = LocalPreference.OnlyRemote
	}

	// TODO - use only media option
	const statuses = await getPublicTimeline(domain, db, localParam)
	return new Response(JSON.stringify(statuses), { headers })
}
