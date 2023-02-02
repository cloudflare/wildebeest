// https://docs.joinmastodon.org/methods/accounts/#get

import { cors } from 'wildebeest/backend/src/utils/cors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import { getAccount } from 'wildebeest/backend/src/accounts/getAccount'

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, params.id as string, env.DATABASE)
}

export async function handleRequest(domain: string, id: string, db: D1Database): Promise<Response> {
	const account = await getAccount(domain, id, db)

	if (account) {
		return new Response(JSON.stringify(account), { headers })
	} else {
		return new Response('', { status: 404 })
	}
}
