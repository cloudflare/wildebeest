// https://docs.joinmastodon.org/methods/statuses/#create

import { createNote } from 'wildebeest/activitypub/objects/note'
import * as objects from 'wildebeest/activitypub/objects/'
import type { Env } from 'wildebeest/types/env'
import type { ContextData } from 'wildebeest/types/context'
import type { MastodonAccount } from 'wildebeest/types/account'

type StatusCreate = {
    status: string
    visibility: string
    sensitive: boolean
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
    return handleRequest(request, env.DATABASE, data.connectedUser)
}

export async function handleRequest(
    request: Request,
    db: D1Database,
    connectedUser: MastodonAccount
): Promise<Response> {
    // TODO: implement Idempotency-Key

    if (request.method !== 'POST') {
        return new Response('', { status: 400 })
    }

    const body = await request.json<StatusCreate>()
    if (body.status === undefined || body.visibility === undefined) {
        return new Response('', { status: 400 })
    }

    const note = await createNote(db, body.status)

    const res: any = {
        id: note.id,
        uri: objects.uri(note.id),
        created_at: new Date(note.cdate).toISOString(),
        account: connectedUser,
        content: body.status,
        visibility: body.visibility ? body.visibility : 'public',
        emojis: [],
        media_attachments: [],
        tags: [],
        mentions: [],
        spoiler_text: '',
    }
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'content-type': 'application/json; charset=utf-8',
    }
    return new Response(JSON.stringify(res), { headers })
}
