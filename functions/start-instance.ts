// First screen to configure and start the instance
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import * as access from 'wildebeest/backend/src/access'
import { parse } from 'cookie'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { InstanceConfig } from 'wildebeest/backend/src/config'
import * as config from 'wildebeest/backend/src/config'

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handlePostRequest(request, env.DATABASE)
}

export async function handlePostRequest(request: Request, db: D1Database): Promise<Response> {
	const data = await request.json<InstanceConfig>()
	if (!data.accessAud || !data.accessDomain) {
		return new Response('', { status: 400 })
	}

	const cookie = parse(request.headers.get('Cookie') || '')
	const jwt = cookie['CF_Authorization']
	if (!jwt) {
		// Allow to configure Access without any authentification
		await config.configureAccess(db, data.accessDomain + '.cloudflareaccess.com', data.accessAud)
		return new Response()
	}

	const validator = access.generateValidator({ jwt, domain: data.accessDomain, aud: data.accessAud })
	const { payload } = await validator(request)

	const identity = await access.getIdentity({ jwt, domain: data.accessDomain })
	if (!identity) {
		return errors.notAuthorized('failed to load identity')
	}

	await config.configure(db, data)
	await config.generateVAPIDKeys(db)

	return new Response('', { status: 201 })
}
