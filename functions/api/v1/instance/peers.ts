import { cors } from 'wildebeest/backend/src/utils/cors'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'
import { getPeers } from 'wildebeest/backend/src/activitypub/peers'

export const onRequest: PagesFunction<Env, any> = async ({ env }) => {
	return handleRequest(await getDatabase(env))
}

export async function handleRequest(db: Database): Promise<Response> {
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	const peers = await getPeers(db)
	return new Response(JSON.stringify(peers), { headers })
}
