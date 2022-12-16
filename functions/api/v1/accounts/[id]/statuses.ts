import type { Env } from 'wildebeest/types/env'
import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import { getPersonById } from 'wildebeest/activitypub/actors'
import { instanceConfig } from 'wildebeest/config/instance'
import { parseHandle } from 'wildebeest/utils/parse'
import type { Handle } from 'wildebeest/utils/parse'
import type { ContextData } from 'wildebeest/types/context'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import * as objects from 'wildebeest/activitypub/objects/'
import { actorURL } from 'wildebeest/activitypub/actors/'
import * as webfinger from 'wildebeest/webfinger/'
import * as outbox from 'wildebeest/activitypub/actors/outbox'
import * as actors from 'wildebeest/activitypub/actors'

const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
    return handleRequest(request, env.DATABASE, params.id as string)
}

export async function handleRequest(request: Request, db: D1Database, id: string): Promise<Response> {
    const handle = parseHandle(id)

    if (handle.domain === null || (handle.domain !== null && handle.domain === instanceConfig.uri)) {
        // Retrieve the statuses from a local user
        return getLocalStatus(request, db, handle)
    } else if (handle.domain !== null) {
        // Retrieve the statuses of a remote actor
        return getRemoteStatus(request, handle)
    } else {
        return new Response('', { status: 403 })
    }
}

async function getRemoteStatus(request: Request, handle: Handle): Promise<Response> {
    const acct = `${handle.localPart}@${handle.domain}`
    const actor = await webfinger.queryAcct(handle.domain!, acct)
    if (actor === null) {
        return new Response('', { status: 404 })
    }

    const activities = await outbox.get(actor)
    const out: Array<MastodonStatus> = []

    for (let i = 0, len = activities.items.length; i < len; i++) {
        // TODO: a better implementation would be to import in the db and reuse the
        // local user code.

        const activity = activities.items[i]
        if (activity.type === 'Create') {
            const obj = activity.object
            if (obj.type === 'Note') {
                const author = await actors.get(activity.actor)
                const acct = `${author.preferredUsername}@${instanceConfig.uri}`
                const account = loadExternalMastodonAccount(acct, author)

                out.push({
                    id: obj.id,
                    uri: obj.url,
                    created_at: obj.published,
                    content: obj.content,
                    emojis: [],
                    media_attachments: [],
                    tags: [],
                    mentions: [],
                    account,

                    // TODO: stub values
                    visibility: 'public',
                    spoiler_text: '',
                })
            } else {
                console.warn(`unsupported object type: ${obj.type}`)
            }
        } else {
            console.warn(`unsupported activity type: ${activity.type}`)
        }
    }

    return new Response(JSON.stringify(out), { headers })
}

async function getLocalStatus(request: Request, db: D1Database, handle: Handle): Promise<Response> {
    const QUERY = `
SELECT objects.*
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE outbox_objects.actor_id = ? AND outbox_objects.cdate > ?
ORDER by outbox_objects.cdate DESC
LIMIT ?
`

    const DEFAULT_LIMIT = 20

    const actorId = actorURL(handle.localPart)

    const out: Array<MastodonStatus> = []

    const url = new URL(request.url)

    let afterCdate = '00-00-00 00:00:00'
    if (url.searchParams.has('max_id')) {
        // Client asked to retrieve statuses after the max_id
        // As opposed to Mastodon we don't use incremental ID but UUID, we need
        // to retrieve the cdate of the max_id row and only show the newer statuses.
        const maxId = url.searchParams.get('max_id')

        const row: any = await db.prepare('SELECT cdate FROM outbox_objects WHERE object_id=?').bind(maxId).first()
        afterCdate = row.cdate
    }

    const { success, error, results } = await db
        .prepare(QUERY)
        .bind(actorId.toString(), afterCdate, DEFAULT_LIMIT)
        .all()
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
