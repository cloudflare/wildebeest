import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { getFollowingId } from 'wildebeest/backend/src/mastodon/follow'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import * as activityCreate from 'wildebeest/backend/src/activitypub/activities/create'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, env.DATABASE, params.id as string)
}

const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export async function handleRequest(domain: string, db: D1Database, id: string): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null) {
		return new Response('', { status: 403 })
	}

	const actorId = actorURL(domain, handle.localPart)
	const actor = await getPersonById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	const following = await getFollowingId(db, actor)

	const out = {
		'@context': ['https://www.w3.org/ns/activitystreams'],
		id: new URL(actor.following + '/page'),
		type: 'OrderedCollectionPage',
		prev: 'https://social.eng.chat/todo',
		partOf: actor.following,
		orderedItems: following,
	}
	return new Response(JSON.stringify(out), { headers })
}
