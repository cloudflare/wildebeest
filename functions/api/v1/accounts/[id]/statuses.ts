import type { Env } from 'wildebeest/types/env'
import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import { getPersonById } from 'wildebeest/activitypub/actors'
import { instanceConfig } from 'wildebeest/config/instance'
import { parseHandle } from 'wildebeest/utils/parse'
import type { ContextData } from 'wildebeest/types/context'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import * as objects from 'wildebeest/activitypub/objects/'
import { actorURL } from 'wildebeest/activitypub/actors/'

const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
    return handleRequest(env.DATABASE, params.id as string)
}

const QUERY = `
SELECT objects.*
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE actor_id = ?
`

export async function handleRequest(db: D1Database, id: string): Promise<Response> {
    const handle = parseHandle(id)
    if (handle.domain !== null && handle.domain !== instanceConfig.uri) {
        // Only retriving statuses of a local user is supported
        return new Response('', { status: 400 })
    }
    const actorId = actorURL(handle.localPart)

    const out: Array<MastodonStatus> = []

    const { success, error, results } = await db.prepare(QUERY).bind(actorId.toString()).all()
    if (!success) {
        throw new Error('SQL error: ' + error)
    }

    if (results && results.length > 0) {
        for (let i = 0, len = results.length; i < len; i++) {
            const result: any = results[i]
            const properties = JSON.parse(result.properties)

            const author = await getPersonById(db, actorId)
            if (author === null) {
                console.error('note author is unknown')
                continue
            }

            const acct = `${author.preferredUsername}@${instanceConfig.uri}`
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
