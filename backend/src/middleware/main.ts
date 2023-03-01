import * as access from 'wildebeest/backend/src/access'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

async function loadContextData(db: Database, clientId: string, email: string, ctx: any): Promise<boolean> {
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
			...cors(),
			'content-type': 'application/json',
		}
		return new Response('', { headers })
	}

	const request = context.request
	const url = new URL(request.url)

	if (
		url.pathname === '/oauth/token' ||
		url.pathname === '/oauth/authorize' || // Cloudflare Access runs on /oauth/authorize
		url.pathname === '/api/v1/instance' ||
		url.pathname === '/api/v2/instance' ||
		url.pathname === '/api/v1/instance/peers' ||
		url.pathname === '/api/v1/apps' ||
		url.pathname === '/api/v1/timelines/public' ||
		url.pathname === '/api/v1/custom_emojis' ||
		url.pathname === '/.well-known/webfinger' ||
		url.pathname === '/api/v1/trends/statuses' ||
		url.pathname === '/api/v1/trends/links' ||
		/^\/api\/v1\/accounts\/(.*)\/statuses$/.test(url.pathname) ||
		url.pathname.startsWith('/api/v1/tags/') ||
		url.pathname.startsWith('/api/v1/timelines/tag/') ||
		url.pathname.startsWith('/ap/') // all ActivityPub endpoints
	) {
		return context.next()
	}

	if (/^\/api\/v1\/statuses\/.*(?<!(reblog|favourite))$/.test(url.pathname) && request.method === 'GET') {
		return context.next()
	}

	try {
		const authorization = request.headers.get('Authorization') || ''
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
		// TODO: since we don't load the instance configuration anymore, we
		// don't need to load the user before anymore.
		if (!(await loadContextData(await getDatabase(context.env), clientId, payload.email, context))) {
			return errors.notAuthorized('failed to load context data')
		}

		const validatate = access.generateValidator({
			jwt,
			domain: context.env.ACCESS_AUTH_DOMAIN,
			aud: context.env.ACCESS_AUD,
		})
		await validatate(request)

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
