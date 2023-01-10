// First screen to configure and start the instance
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import * as access from 'wildebeest/backend/src/access'
import { parse } from 'cookie'
import type { InstanceConfig } from 'wildebeest/backend/src/config'
import * as config from 'wildebeest/backend/src/config'

export const onRequestPost: PagesFunction<Env, any> = async ({ request, env }) => {
	return handlePostRequest(request, env.DATABASE, env.ACCESS_AUTH_DOMAIN, env.ACCESS_AUD)
}

export const onRequestGet: PagesFunction<Env, any> = async (ctx) => {
	const { request, env } = ctx
	const cookie = parse(request.headers.get('Cookie') || '')
	const jwt = cookie['CF_Authorization']
	if (!jwt) {
		const url = access.generateLoginURL({
			redirectURL: new URL('/start-instance', 'https://' + env.DOMAIN),
			domain: env.ACCESS_AUTH_DOMAIN,
			aud: env.ACCESS_AUD,
		})
		return Response.redirect(url)
	}

	const frontend = await import('../frontend/server/entry.cloudflare-pages')
	return frontend.onRequest(ctx)
}

export async function handlePostRequest(
	request: Request,
	db: D1Database,
	accessDomain: string,
	accessAud: string
): Promise<Response> {
	const data = await request.json<InstanceConfig>()

	const cookie = parse(request.headers.get('Cookie') || '')
	const jwt = cookie['CF_Authorization']
	if (!jwt) {
		return new Response('', { status: 401 })
	}

	const validator = access.generateValidator({ jwt, domain: accessDomain, aud: accessAud })
	await validator(request)

	const identity = await access.getIdentity({ jwt, domain: accessDomain })
	if (!identity) {
		return errors.notAuthorized('failed to load identity')
	}

	await config.configure(db, data)
	await config.generateVAPIDKeys(db)

	return new Response('', { status: 201 })
}
