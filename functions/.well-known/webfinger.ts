// https://www.rfc-editor.org/rfc/rfc7033

import { parseHandle } from '../../utils/parse'
import { getPersonById } from 'wildebeest/activitypub/actors'
import { instanceConfig } from '../../config/instance'
import type { Env } from '../../types/env'
import type { WebFingerResponse } from '../../webfinger/'

export const onRequest: PagesFunction<Env, any> = async ({ request, env }) => {
    return handleRequest(request, env.DATABASE)
}

const headers = {
    'content-type': 'application/jrd+json',
    'cache-control': 'max-age=3600, public',
}

export async function handleRequest(request: Request, db: D1Database): Promise<Response> {
    const url = new URL(request.url)
    const resource = url.searchParams.get('resource')
    if (!resource) {
        return new Response('', { status: 400 })
    }

    const parts = resource.split(':')
    if (parts.length !== 2 || parts[0] !== 'acct') {
        return new Response('', { status: 400 })
    }

    const handle = parseHandle(parts[1])
    if (handle.domain === null) {
        return new Response('', { status: 400 })
    }

    // TODO: check that the domain is the current uri

    const person = await getPersonById(db, handle.localPart)
    if (person === null) {
        return new Response('', { status: 404 })
    }

    const jsonLink = person.id

    const res: WebFingerResponse = {
        subject: `acct:${handle.localPart}@${handle.domain}`,
        aliases: [jsonLink],
        links: [
            {
                rel: 'self',
                type: 'application/activity+json',
                href: jsonLink,
            },
        ],
    }

    return new Response(JSON.stringify(res), { status: 200, headers })
}
