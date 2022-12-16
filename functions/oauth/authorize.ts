// https://docs.joinmastodon.org/methods/oauth/#authorize

import type { Env } from 'wildebeest/types/env'
import { accessConfig } from 'wildebeest/config/access'
import * as access from 'wildebeest/access/'
import { getPersonByEmail, createPerson } from 'wildebeest/activitypub/actors'

// Extract the JWT token sent by Access (running before us).
const extractJWTFromRequest = (request: Request) => request.headers.get('Cf-Access-Jwt-Assertion') || ''

export const onRequest: PagesFunction<Env, any> = async ({ request, env }) => {
    return handleRequest(request, env.DATABASE, env.userKEK)
}

export async function handleRequest(request: Request, db: D1Database, userKEK: string): Promise<Response> {
    const url = new URL(request.url)

    if (
        !(
            url.searchParams.has('redirect_uri') &&
            url.searchParams.has('response_type') &&
            url.searchParams.has('client_id')
        )
    ) {
        return new Response('', { status: 400 })
    }

    const response_type = url.searchParams.get('response_type')
    if (response_type !== 'code') {
        return new Response('', { status: 400 })
    }

    const redirect_uri = url.searchParams.get('redirect_uri')
    const scope = url.searchParams.get('scope') || ''

    const jwt = extractJWTFromRequest(request)
    const validator = access.generateValidator({ jwt, ...accessConfig })
    const { payload } = await validator(request)

    const identity = await access.getIdentity({ jwt, domain: accessConfig.domain })
    if (!identity) {
        return new Response('', { status: 401 })
    }

    const person = await getPersonByEmail(db, identity.email)
    if (person === null) {
        const properties: any = {}

        if (identity.name !== undefined) {
            properties.name = identity.name
        }

        await createPerson(db, userKEK, identity.email, properties)
    }

    if (redirect_uri === 'urn:ietf:wg:oauth:2.0:oob') {
        return new Response(jwt)
    } else {
        return Response.redirect(redirect_uri + '?code=' + jwt, 302)
    }
}
