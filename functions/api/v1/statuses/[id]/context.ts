// https://docs.joinmastodon.org/methods/statuses/#context

import { cors } from 'wildebeest/backend/src/utils/cors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import { getReplies } from 'wildebeest/backend/src/mastodon/reply'
import type { Context } from 'wildebeest/backend/src/types/status'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, await getDatabase(env), params.id as string)
}

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export async function handleRequest(domain: string, db: Database, id: string): Promise<Response> {
	const obj = await getObjectByMastodonId(db, id)
	if (obj === null) {
		return new Response('', { status: 404 })
	}

	const descendants = await getReplies(domain, db, obj)
	const out: Context = {
		ancestors: [],
		descendants,
	}

	return new Response(JSON.stringify(out), { headers })
}
