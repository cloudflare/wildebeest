import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as actors from 'wildebeest/backend/src/activitypub/actors'

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, await getDatabase(env), params.id as string)
}

const headers = {
	...cors(),
	'content-type': 'application/activity+json; charset=utf-8',
	'Cache-Control': 'max-age=180, public',
}

export async function handleRequest(domain: string, db: Database, id: string): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null && handle.domain !== domain) {
		return new Response('', { status: 403 })
	}

	const person = await actors.getActorById(db, actorURL(domain, handle.localPart))
	if (person === null) {
		return new Response('', { status: 404 })
	}

	const res = {
		// TODO: should this be part of the actor object?
		'@context': [
			'https://www.w3.org/ns/activitystreams',
			'https://w3id.org/security/v1',
			{
				toot: 'http://joinmastodon.org/ns#',
				discoverable: 'toot:discoverable',
				alsoKnownAs: {
					'@id': 'as:alsoKnownAs',
					'@type': '@id',
				},
			},
		],

		...person,
	}

	return new Response(JSON.stringify(res), { status: 200, headers })
}
