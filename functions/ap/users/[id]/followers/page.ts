import { parseHandle } from 'wildebeest/utils/parse'
import { getFollowers } from 'wildebeest/activitypub/actors/follow'
import * as objects from 'wildebeest/activitypub/objects/'
import type { Activity } from 'wildebeest/activitypub/activities/'
import { getPersonById } from 'wildebeest/activitypub/actors'
import { actorURL } from 'wildebeest/activitypub/actors/'
import type { ContextData } from 'wildebeest/types/context'
import type { Env } from 'wildebeest/types/env'
import type { Note } from 'wildebeest/activitypub/objects/note'
import * as activityCreate from 'wildebeest/activitypub/activities/create'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	return handleRequest(env.DATABASE, params.id as string)
}

const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export async function handleRequest(db: D1Database, id: string): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null) {
		return new Response('', { status: 403 })
	}

	const actorId = actorURL(handle.localPart)
	const actor = await getPersonById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	const followers = await getFollowers(db, actor)

	const out = {
		'@context': ['https://www.w3.org/ns/activitystreams'],
		id: new URL(actor.followers + '/page'),
		type: 'OrderedCollectionPage',
		prev: 'https://social.eng.chat/todo',
		partOf: actor.followers,
		orderedItems: followers,
	}
	return new Response(JSON.stringify(out), { headers })
}
