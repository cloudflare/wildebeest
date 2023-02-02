import { cors } from 'wildebeest/backend/src/utils/cors'
import type { Env } from 'wildebeest/backend/src/types/env'
import { getPeers } from 'wildebeest/backend/src/activitypub/peers'

export const onRequest: PagesFunction<Env, any> = async ({ env }) => {
	return handleRequest(env.DATABASE)
}

export async function handleRequest(db: D1Database): Promise<Response> {
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	const peers = await getPeers(db)
	return new Response(JSON.stringify(peers), { headers })
}
