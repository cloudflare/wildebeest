// https://docs.joinmastodon.org/methods/tags/#get

import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import { getTag } from 'wildebeest/backend/src/mastodon/hashtag'
import * as errors from 'wildebeest/backend/src/errors'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

const headers = {
	...cors(),
	'content-type': 'application/json',
} as const

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ params, env, request }) => {
	const domain = new URL(request.url).hostname
	return handleRequestGet(await getDatabase(env), domain, params.tag as string)
}

export async function handleRequestGet(db: Database, domain: string, value: string): Promise<Response> {
	const tag = await getTag(db, domain, value)
	if (tag === null) {
		return errors.tagNotFound(value)
	}
	return new Response(JSON.stringify(tag), { headers })
}
