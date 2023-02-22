import type { Env } from 'wildebeest/backend/src/types/env'
import { getDatabase } from 'wildebeest/backend/src/database'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import * as neon from '@neondatabase/serverless'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ env }) => {
	const client = new neon.Client(env.NEON_DATABASE_URL!)
	console.log(env.NEON_DATABASE_URL!)
	await client.connect()

	const res = await client.query('select 2')
	return new Response(JSON.stringify(res))
}
