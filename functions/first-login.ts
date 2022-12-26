// Screen after the first login to let the user configure the account (username
// especially)
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import * as errors from 'wildebeest/backend/src/errors'

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handlePostRequest(request, env.DATABASE, env.userKEK)
}

// FIXME: move this behind Cloudflare Access. We can find the JWT in the cookies
export async function handlePostRequest(request: Request, db: D1Database, userKEK: string): Promise<Response> {
	const formData = await request.formData()
	const properties: any = {}

	if (formData.has('username')) {
		properties.preferredUsername = formData.get('username') || ''
	}

	if (formData.has('name')) {
		properties.name = formData.get('name') || ''
	}

	const url = new URL(request.url)

	// TODO: email is in the JWT, should be parsed, verified and passed in the
	// request context.
	const email = url.searchParams.get('email') || ''

	await createPerson(db, userKEK, email, properties)

	if (!url.searchParams.has('redirect_uri')) {
		return new Response('', { status: 400 })
	}

	const redirect_uri = decodeURIComponent(url.searchParams.get('redirect_uri') || '')
	return Response.redirect(redirect_uri, 302)
}
