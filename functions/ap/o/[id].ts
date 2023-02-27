import { cors } from 'wildebeest/backend/src/utils/cors'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as objects from 'wildebeest/backend/src/activitypub/objects'

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, await getDatabase(env), params.id as string)
}

const headers = {
	...cors(),
	'content-type': 'application/activity+json; charset=utf-8',
}

export async function handleRequest(domain: string, db: Database, id: string): Promise<Response> {
	const obj = await objects.getObjectById(db, objects.uri(domain, id))
	if (obj === null) {
		return new Response('', { status: 404 })
	}

	const res = {
		// TODO: should this be part of the object?
		'@context': [
			'https://www.w3.org/ns/activitystreams',
			{
				ostatus: 'http://ostatus.org#',
				atomUri: 'ostatus:atomUri',
				inReplyToAtomUri: 'ostatus:inReplyToAtomUri',
				conversation: 'ostatus:conversation',
				sensitive: 'as:sensitive',
				toot: 'http://joinmastodon.org/ns#',
				votersCount: 'toot:votersCount',
			},
		],

		...obj,
	}

	return new Response(JSON.stringify(res), { status: 200, headers })
}
