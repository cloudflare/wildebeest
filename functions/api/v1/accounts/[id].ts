// https://docs.joinmastodon.org/methods/accounts/#get

import type { Env } from 'wildebeest/types/env'
import type { MastodonAccount } from 'wildebeest/types/account'
import { parseHandle } from 'wildebeest/utils/parse'
import { queryAcct } from 'wildebeest/webfinger/index'
import { toMastodonAccount } from 'wildebeest/mastodon/account'

const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
}

export const onRequest: PagesFunction<Env, any> = async ({ params }) => {
    return handleRequest(params.id as string)
}

export async function handleRequest(id: string): Promise<Response> {
    const handle = parseHandle(id)

    if (handle.domain === null) {
        // FIXME: only remote users are supported at the moment.
        return new Response('', { status: 404 })
    }

    // TODO: using webfinger isn't the optimal implemnetation. We could cache
    // the object in D1 and directly query the remote API, indicated by the actor's
    // url field. For now, let's keep it simple.
    const acct = `${handle.localPart}@${handle.domain}`
    const actor = await queryAcct(handle.domain, acct)
    if (actor === null) {
        return new Response('', { status: 404 })
    }

    const res = toMastodonAccount(acct, actor)
    return new Response(JSON.stringify(res), { headers })
}
