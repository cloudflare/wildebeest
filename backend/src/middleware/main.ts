import * as access from 'wildebeest/backend/src/access'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { Identity, ContextData } from 'wildebeest/backend/src/types/context'
import * as errors from 'wildebeest/backend/src/errors'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'

async function loadContextData(db: D1Database, clientId: string, email: string): Promise<ContextData | null> {
	const query = `
        SELECT
            actors.*,
            (SELECT value FROM instance_config WHERE key='accessAud') as accessAud,
            (SELECT value FROM instance_config WHERE key='accessDomain') as accessDomain
        FROM actors
        WHERE email=? AND type='Person'
    `
	const { results, success, error } = await db.prepare(query).bind(email).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results || results.length === 0) {
		console.warn('no results')
		return null
	}

	const row: any = results[0]

	if (!row.id) {
		console.warn('person not found')
		return null
	}
	if (!row.accessDomain || !row.accessAud) {
		console.warn('access configuration not found')
		return null
	}

	const person = actors.personFromRow(row)

	return {
		connectedActor: person,
		identity: { email },
		clientId,
		accessDomain: row.accessDomain,
		accessAud: row.accessAud,
	}
}

export async function auth(context: EventContext<Env, any, any>) {
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
		url.pathname === '/api/v2/instance' ||
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
			context.data.clientId = clientId

			const jwt = jwtParts.join('.')

			const payload = access.getPayload(jwt)
			if (!payload.email) {
				return errors.notAuthorized('missing email')
			}

			// Load the user associated with the email in the payload *before*
			// verifying the JWT validity.
			// This is because loading the context will also load the access
			// configuration, which are used to verify the JWT.
			const data = await loadContextData(context.env.DATABASE, clientId, payload.email)
			if (data === null) {
				return errors.notAuthorized('failed to load context data')
			}

			const validatate = access.generateValidator({ jwt, domain: data.accessDomain, aud: data.accessAud })
			await validatate(context.request)

			// Once we ensured the JWt is valid, we can use the data.
			context.data = data

			const identity = await access.getIdentity({ jwt, domain: data.accessDomain })
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
