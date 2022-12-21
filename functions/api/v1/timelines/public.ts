import type { Env } from 'wildebeest/types/env'
import * as objects from 'wildebeest/activitypub/objects/'
import { urlToHandle } from 'wildebeest/utils/handle'
import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import { getPersonById } from 'wildebeest/activitypub/actors'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
	return handleRequest(env.DATABASE)
}

export async function handleRequest(db: D1Database): Promise<Response> {
	const out: Array<MastodonStatus> = []

	const QUERY = `
SELECT objects.*
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE objects.type = 'Note'
ORDER by outbox_objects.cdate DESC
LIMIT ?
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db.prepare(QUERY).bind(DEFAULT_LIMIT).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (results && results.length > 0) {
		for (let i = 0, len = results.length; i < len; i++) {
			const result: any = results[i]
			const properties = JSON.parse(result.properties)
			const actorId = new URL(result.original_actor_id)

			const author = await getPersonById(db, actorId)
			if (author === null) {
				console.error('note author is unknown')
				continue
			}

			const acct = urlToHandle(actorId)
			const account = loadExternalMastodonAccount(acct, author)

			out.push({
				id: result.id,
				uri: objects.uri(result.id),
				created_at: new Date(result.cdate).toISOString(),
				content: properties.content,
				emojis: [],
				media_attachments: [],
				tags: [],
				mentions: [],
				account,

				// TODO: stub values
				visibility: 'public',
				spoiler_text: '',
			})
		}
	}

	return new Response(JSON.stringify(out), { headers })
}
