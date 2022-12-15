import type { Env } from 'wildebeest/types/env'
import type { ContextData } from 'wildebeest/types/context'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import * as objects from 'wildebeest/activitypub/objects/'

const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
    return handleRequest(env.DATABASE, data.connectedUser)
}

const QUERY = `
SELECT objects.*
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE actor_id = ?
`

export async function handleRequest(db: D1Database, connectedUser: MastodonAccount): Promise<Response> {
    const out: Array<MastodonStatus> = []

    const { success, error, results } = await db.prepare(QUERY).bind(connectedUser.id).all()
    if (!success) {
        throw new Error('SQL error: ' + error)
    }

    if (results && results.length > 0) {
        for (let i = 0, len = results.length; i < len; i++) {
            const result: any = results[i]
            const properties = JSON.parse(result.properties)

            out.push({
                id: result.id,
                uri: objects.uri(result.id),
                created_at: new Date(result.cdate).toISOString(),
                content: properties.content,
                account: connectedUser,

                // TODO: stub values
                visibility: 'public',
                spoiler_text: '',
            })
        }
    }

    return new Response(JSON.stringify(out), { headers })
}
