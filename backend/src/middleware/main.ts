import * as access from 'wildebeest/backend/src/access'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { Identity, ContextData } from 'wildebeest/backend/src/types/context'
import * as errors from 'wildebeest/backend/src/errors'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'

async function loadContextData(db: D1Database, clientId: string, email: string, ctx: any): Promise<boolean> {
	const query = `
        SELECT *
        FROM actors
        WHERE email=? AND type='Person'
    `
	const { results, success, error } = await db.prepare(query).bind(email).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results || results.length === 0) {
		console.warn('no results')
		return false
	}

	const row: any = results[0]

	if (!row.id) {
		console.warn('person not found')
		return false
	}

	const person = actors.personFromRow(row)

	ctx.data.connectedActor = person
	ctx.data.identity = { email }
	ctx.data.clientId = clientId

	return true
}

export async function main(context: EventContext<Env, any, any>) {
	if (context.request.method === 'OPTIONS') {
		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'content-type, authorization',
			'Access-Control-Allow-Methods': 'GET, PUT, POST',
			'content-type': 'application/json',
		}
		return new Response('', { headers })
	}

	const url = new URL(context.request.url)
	if (
		url.pathname === '/oauth/token' ||
		url.pathname === '/oauth/authorize' || // Cloudflare Access runs on /oauth/authorize
		url.pathname === '/api/v1/instance' ||
		url.pathname === '/api/v1/apps' ||
		url.pathname === '/api/v1/timelines/public' ||
		url.pathname === '/api/v1/custom_emojis' ||
		url.pathname === '/.well-known/webfinger' ||
		url.pathname === '/start-instance' || // Access is required by the handler
		url.pathname === '/start-instance-test-access' || // Access is required by the handler
		url.pathname.startsWith('/ap/') // all ActivityPub endpoints
	) {
		return context.next()
	} else {
		try {
			const authorization = context.request.headers.get('Authorization') || ''
			const token = authorization.replace('Bearer ', '')

			if (token === '') {
				return errors.notAuthorized('missing authorization')
			}

			const parts = token.split('.')
			const [clientId, ...jwtParts] = parts

			const jwt = jwtParts.join('.')

			const payload = access.getPayload(jwt)
			if (!payload.email) {
				return errors.notAuthorized('missing email')
			}

			// Load the user associated with the email in the payload *before*
			// verifying the JWT validity.
			// This is because loading the context will also load the access
			// configuration, which are used to verify the JWT.
			if (!(await loadContextData(context.env.DATABASE, clientId, payload.email, context))) {
				return errors.notAuthorized('failed to load context data')
			}

			const validatate = access.generateValidator({
				jwt,
				domain: context.env.ACCESS_AUTH_DOMAIN,
				aud: context.env.ACCESS_AUD,
			})
			await validatate(context.request)

			const identity = await access.getIdentity({ jwt, domain: context.env.ACCESS_AUTH_DOMAIN })
			if (!identity) {
				return errors.notAuthorized('failed to load identity')
			}

			return context.next()
		} catch (err: any) {
			console.warn(err.stack)
			return errors.notAuthorized('unknown error occurred')
		}
	}
}
