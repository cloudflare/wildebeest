import type { Env } from 'wildebeest/backend/src/types/env'
import * as access from 'wildebeest/backend/src/access'
import * as errors from 'wildebeest/backend/src/errors'
import { parse } from 'cookie'
import type { ContextData } from 'wildebeest/backend/src/types/context'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ request, env }) => {
	return handleGetRequest(env, request)
}

// Route to test if Access has been configured properly
export async function handleGetRequest(env: Env, request: Request): Promise<Response> {
	const db = env.DATABASE
	const query = `
        SELECT * FROM instance_config WHERE key IN ('accessDomain', 'accessAud')
    `
	const { results, error, success } = await db.prepare(query).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	const data: any = {}
	if (results) {
		for (let i = 0, len = results.length; i < len; i++) {
			const row: any = results[i]
			data[row.key] = row.value
		}
	}

	const cookie = parse(request.headers.get('Cookie') || '')
	const jwt = cookie['CF_Authorization']
	if (!jwt) {
		return errors.notAuthorized('missing authorization')
	}

	const domain = env.ACCESS_AUTH_DOMAIN

	const validator = access.generateValidator({ jwt, domain, aud: env.ACCESS_AUD })
	await validator(request)

	const identity = await access.getIdentity({ jwt, domain })
	if (!identity) {
		return errors.notAuthorized('failed to load identity')
	}

	return new Response(JSON.stringify({ email: identity.email }))
}
