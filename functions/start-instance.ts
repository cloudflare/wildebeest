// First screen to configure and start the instance
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { InstanceConfig } from 'wildebeest/backend/src/config'
import { configure } from 'wildebeest/backend/src/config'

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handlePostRequest(request, env.DATABASE)
}

export async function handlePostRequest(request: Request, db: D1Database): Promise<Response> {
	const data = await request.json<InstanceConfig>()
	await configure(db, data)
	return new Response()
}
