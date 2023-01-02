// https://docs.joinmastodon.org/methods/oauth/#authorize

import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import * as access from 'wildebeest/backend/src/access'
import { getPersonByEmail } from 'wildebeest/backend/src/activitypub/actors'

// Extract the JWT token sent by Access (running before us).
const extractJWTFromRequest = (request: Request) => request.headers.get('Cf-Access-Jwt-Assertion') || ''

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ data, request, env }) => {
	return handleRequest(request, env.DATABASE, env.userKEK)
}

export async function handleRequest(request: Request, db: D1Database, userKEK: string): Promise<Response> {
	if (request.method === 'OPTIONS') {
		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'content-type, authorization',
			'content-type': 'application/json',
		}
		return new Response('', { headers })
	}

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

	const clientId = url.searchParams.get('client_id') || ''
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const redirect_uri = url.searchParams.get('redirect_uri')
	if (client.redirect_uris !== redirect_uri) {
		return new Response('', { status: 403 })
	}

	const scope = url.searchParams.get('scope') || ''

	const query = `
        SELECT
            (SELECT value FROM instance_config WHERE key='accessAud') as accessAud,
            (SELECT value FROM instance_config WHERE key='accessDomain') as accessDomain
    `
	const config: any = await db.prepare(query).first()

	const jwt = extractJWTFromRequest(request)
	const validate = access.generateValidator({ jwt, domain: config.accessDomain, aud: config.accessAud })
	await validate(request)

	const identity = await access.getIdentity({ jwt, domain: config.accessDomain })
	if (!identity) {
		return new Response('', { status: 401 })
	}

	const code = `${client.id}.${jwt}`

	const person = await getPersonByEmail(db, identity.email)
	if (person === null) {
		url.pathname = '/first-login'
		url.searchParams.set('email', identity.email)
		url.searchParams.set('redirect_uri', encodeURIComponent(redirect_uri + '?code=' + code))
		return Response.redirect(url.toString(), 302)
	}

	return Response.redirect(redirect_uri + '?code=' + code, 302)
}
