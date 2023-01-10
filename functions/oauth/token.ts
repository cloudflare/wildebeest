// https://docs.joinmastodon.org/methods/oauth/#token

import * as errors from 'wildebeest/backend/src/errors'
import type { Env } from 'wildebeest/backend/src/types/env'
import { getClientById } from 'wildebeest/backend/src/mastodon/client'

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
	return handleRequest(env.DATABASE, request)
}

export async function handleRequest(db: D1Database, request: Request): Promise<Response> {
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'content-type': 'application/json; charset=utf-8',
	}

	if (request.method === 'OPTIONS') {
		return new Response('', { headers })
	}

	const formData = await request.formData()
	const code = formData.get('code')
	if (!code) {
		return errors.notAuthorized('missing authorization')
	}

	const parts = code.split('.')
	const clientId = parts[0]

	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const res = {
		access_token: code,
		token_type: 'Bearer',
		scope: client.scopes,
		created_at: (Date.now() / 1000) | 0,
	}
	return new Response(JSON.stringify(res), { headers })
}
