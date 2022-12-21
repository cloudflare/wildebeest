import { parseHandle } from 'wildebeest/utils/parse'
import type { Env } from 'wildebeest/types/env'
import * as actors from 'wildebeest/activitypub/actors'
import { actorURL } from 'wildebeest/activitypub/actors/'
import { getFollowingId } from 'wildebeest/activitypub/actors/follow'

const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
	return handleRequest(env.DATABASE, params.id as string)
}

export async function handleRequest(db: D1Database, id: string): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null) {
		return new Response('', { status: 403 })
	}

	const actorId = actorURL(handle.localPart)
	const actor = await actors.getPersonById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	const following = await getFollowingId(db, actor)

	const out = {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id: actor.following,
		type: 'OrderedCollection',
		totalItems: following.length,
		first: new URL(actor.following + '/page'),
		last: new URL(actor.following + '/page?min_id=0'),
	}
	return new Response(JSON.stringify(out), { headers })
}