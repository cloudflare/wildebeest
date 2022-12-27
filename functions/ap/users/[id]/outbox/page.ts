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
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
}

const DEFAULT_LIMIT = 20

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

	const items: Array<Activity> = []

	// TODO: eventually move to a shared file
	const QUERY = `
SELECT objects.*
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE outbox_objects.actor_id = ? AND objects.type = 'Note'
ORDER by outbox_objects.cdate DESC
LIMIT ?
`

	const { success, error, results } = await db.prepare(QUERY).bind(actorId.toString(), DEFAULT_LIMIT).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (results && results.length > 0) {
		for (let i = 0, len = results.length; i < len; i++) {
			const result: any = results[i]
			const properties = JSON.parse(result.properties)

			const note: Note = {
				id: new URL(objects.uri(domain, result.id)),
				atomUri: new URL(objects.uri(domain, result.id)),
				type: 'Note',
				published: new Date(result.cdate).toISOString(),

				// FIXME: stub
				sensitive: false,
				attachment: [],
				tag: [],
				replies: {
					first: {
						items: [],
						next: 'https://social.eng.chat/users/babeljs/statuses/109372762645660352/replies?only_other_accounts=true&page=true',
						partOf: 'https://social.eng.chat/users/babeljs/statuses/109372762645660352/replies',
						type: 'CollectionPage',
					},
					id: 'https://social.eng.chat/users/babeljs/statuses/109372762645660352/replies',
					type: 'Collection',
				},

				...properties,
			}
			const activity = activityCreate.create(domain, actor, note)
			delete activity['@context']
			activity.id = note.id + '/activity'
			activity.published = new Date(result.cdate).toISOString()
			activity.to = ['https://www.w3.org/ns/activitystreams#Public']
			activity.cc = [actor.followers]
			items.push(activity)
		}
	}

	const out = {
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
		id: new URL(actor.outbox + '/page'),
		type: 'OrderedCollectionPage',
		prev: 'https://social.eng.chat/todo',
		partOf: actor.outbox,
		orderedItems: items,
	}
	return new Response(JSON.stringify(out), { headers })
}
