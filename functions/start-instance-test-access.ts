import type { Env } from 'wildebeest/backend/src/types/env'
import * as access from 'wildebeest/backend/src/access'
import * as errors from 'wildebeest/backend/src/errors'
import { parse } from 'cookie'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { InstanceConfig } from 'wildebeest/backend/src/config'
import { configure } from 'wildebeest/backend/src/config'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ request, data, env }) => {
	return handleGetRequest(env.DATABASE, request)
}

// Route to test if Access has been configured properly
export async function handleGetRequest(db: D1Database, request: Request): Promise<Response> {
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

	const domain = data.accessDomain

	const validator = access.generateValidator({ jwt, domain, aud: data.accessAud })
	const { payload } = await validator(request)

	const identity = await access.getIdentity({ jwt, domain })
	if (!identity) {
		return errors.notAuthorized('failed to load identity')
	}

	return new Response(JSON.stringify({ email: identity.email }))
}
