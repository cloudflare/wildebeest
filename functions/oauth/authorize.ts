// https://docs.joinmastodon.org/methods/oauth/#authorize

import { cors } from 'wildebeest/backend/src/utils/cors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import * as access from 'wildebeest/backend/src/access'
import { getPersonByEmail } from 'wildebeest/backend/src/activitypub/actors'

// Extract the JWT token sent by Access (running before us).
const extractJWTFromRequest = (request: Request) => request.headers.get('Cf-Access-Jwt-Assertion') || ''

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env }) => {
	return handleRequestPost(request, env.DATABASE, env.userKEK, env.ACCESS_AUTH_DOMAIN, env.ACCESS_AUD)
}

export async function handleRequestPost(
	request: Request,
	db: D1Database,
	userKEK: string,
	accessDomain: string,
	accessAud: string
): Promise<Response> {
	if (request.method === 'OPTIONS') {
		const headers = {
			...cors(),
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

	const state = url.searchParams.get('state')

	const jwt = extractJWTFromRequest(request)
	const validate = access.generateValidator({ jwt, domain: accessDomain, aud: accessAud })
	await validate(request)

	const identity = await access.getIdentity({ jwt, domain: accessDomain })
	if (!identity) {
		return new Response('', { status: 401 })
	}

	const code = `${client.id}.${jwt}`

	const redirect = redirect_uri + `?code=${code}` + (state ? `&state=${state}` : '')

	const person = await getPersonByEmail(db, identity.email)
	if (person === null) {
		url.pathname = '/first-login'
		url.searchParams.set('email', identity.email)
		url.searchParams.set('redirect_uri', encodeURIComponent(redirect))
		return URLsafeRedirect(url.toString())
	}

	return URLsafeRedirect(redirect)
}

// Workaround bug EW-7148, constructing an URL with unknown protocols
// throws an error. This happens when using an Android or iOS based URLs.
// `URLsafeRedirect` mimics `Response.redirect` but does not rely on the URL
// class for parsing.
function URLsafeRedirect(location: string): Response {
	const headers = { location }
	return new Response(`redirect to ${location}.`, { status: 302, headers })
}
