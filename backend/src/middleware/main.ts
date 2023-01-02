import * as access from 'wildebeest/backend/src/access'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { accessConfig } from 'wildebeest/config/access'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'

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

			const validator = access.generateValidator({ jwt, ...accessConfig })
			const { payload } = await validator(context.request)

			const identity = await access.getIdentity({ jwt, domain: accessConfig.domain })
			if (!identity) {
				return errors.notAuthorized('failed to load identity')
			}
			context.data.identity = identity

			const person = await actors.getPersonByEmail(context.env.DATABASE, identity.email)
			if (person === null) {
				return errors.notAuthorized('user not found')
			}

			context.data.connectedActor = person

			return context.next()
		} catch (err: any) {
			console.warn(err.stack)
			return errors.notAuthorized('unknown error occurred')
		}

		return new Response(null, {
			status: 302,
			headers: {
				Location: access.generateLoginURL({
					redirectURL: context.request.url,
					domain: accessConfig.domain,
					aud: accessConfig.aud,
				}),
			},
		})
	}
}
