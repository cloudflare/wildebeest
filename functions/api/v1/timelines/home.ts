import type { Env } from 'wildebeest/types/env'
import type { ContextData } from 'wildebeest/types/context'
import type { Actor } from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import { urlToHandle } from 'wildebeest/utils/handle'
import { toMastodonStatusFromRow } from 'wildebeest/mastodon/status'
import { getPersonById } from 'wildebeest/activitypub/actors'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import { getFollowingId } from 'wildebeest/activitypub/actors/follow'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	return handleRequest(env.DATABASE, data.connectedActor)
}

export async function handleRequest(db: D1Database, connectedActor: Actor): Promise<Response> {
	const following = await getFollowingId(db, connectedActor)
	if (following.length === 0) {
		return new Response(JSON.stringify([]), { headers })
	}

	const QUERY = `
SELECT objects.*
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE objects.type = 'Note' AND outbox_objects.actor_id IN (SELECT value FROM json_each(?))
ORDER by outbox_objects.cdate DESC
LIMIT ?
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db.prepare(QUERY).bind(JSON.stringify(following), DEFAULT_LIMIT).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
	if (!results) {
		return new Response(JSON.stringify([]), { headers })
	}

	const out = await Promise.all(results.map((row) => toMastodonStatusFromRow(db, row)))
	return new Response(JSON.stringify(out), { headers })
}
