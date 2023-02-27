import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { getFollowers } from 'wildebeest/backend/src/mastodon/follow'
import { getActorById } from 'wildebeest/backend/src/activitypub/actors'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, await getDatabase(env), params.id as string)
}

const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export async function handleRequest(domain: string, db: Database, id: string): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null) {
		return new Response('', { status: 403 })
	}

	const actorId = actorURL(domain, handle.localPart)
	const actor = await getActorById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	const followers = await getFollowers(db, actor)

	const out = {
		'@context': ['https://www.w3.org/ns/activitystreams'],
		id: new URL(actor.followers + '/page'),
		type: 'OrderedCollectionPage',
		partOf: actor.followers,
		orderedItems: followers,

		// FIXME: stub values
		prev: 'https://example.com/todo',
	}
	return new Response(JSON.stringify(out), { headers })
}
