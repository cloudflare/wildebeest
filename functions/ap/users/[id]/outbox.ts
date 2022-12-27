import { parseHandle } from 'wildebeest/backend/src/utils/parse'
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
	return handleRequest(domain, env.DATABASE, params.id as string, env.userKEK)
}

const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export async function handleRequest(domain: string, db: D1Database, id: string, userKEK: string): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null) {
		return new Response('', { status: 403 })
	}

	const actorId = actorURL(domain, handle.localPart)
	const actor = await getPersonById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	// TODO: eventually move to a shared file
	const QUERY = `
SELECT count(*) as count
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE outbox_objects.actor_id = ? AND objects.type = 'Note'
`

	const { success, error, results } = await db.prepare(QUERY).bind(actorId.toString()).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
	const result: any = (results as any)[0]

	const out = {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id: actor.outbox,
		type: 'OrderedCollection',
		totalItems: result.count,
		first: new URL(actor.outbox + '/page'),
		last: new URL(actor.outbox + '/page?min_id=0'),
	}
	return new Response(JSON.stringify(out), { headers })
}
