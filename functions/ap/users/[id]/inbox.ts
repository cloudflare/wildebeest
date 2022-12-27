import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import * as activityHandler from 'wildebeest/backend/src/activitypub/activities/handle'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import * as activities from 'wildebeest/backend/src/activitypub/activities'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import { parseRequest } from 'wildebeest/backend/src/utils/httpsigjs/parser'
import { fetchKey, verifySignature } from 'wildebeest/backend/src/utils/httpsigjs/verifier'
import { generateDigestHeader } from 'wildebeest/backend/src/utils/http-signing-cavage'
import * as timeline from 'wildebeest/backend/src/mastodon/timeline'

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
	const parsedSignature = parseRequest(request)
	const pubKey = await fetchKey(parsedSignature)
	const valid = await verifySignature(parsedSignature, pubKey)
	if (!valid) {
		return new Response('invalid signature', { status: 401 })
	}

	const body = await request.text()
	if (request.method == 'POST') {
		const digest = request.headers.get('digest')
		const generatedDigest = await generateDigestHeader(body)
		if (digest != generatedDigest) {
			return new Response('invalid digest', { status: 401 })
		}
	}

	const activity: Activity = JSON.parse(body)
	const domain = new URL(request.url).hostname
	return handleRequest(domain, env.DATABASE, env.KV_CACHE, params.id as string, activity, env.userKEK)
}

export async function handleRequest(
	domain: string,
	db: D1Database,
	cache: KVNamespace,
	id: string,
	activity: Activity,
	userKEK: string
): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null && handle.domain !== domain) {
		return new Response('', { status: 403 })
	}

	const actorId = actorURL(domain, handle.localPart)
	const actor = await actors.getPersonById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	await activityHandler.handle(domain, activity, db, userKEK, 'inbox')

	// Assuming we received new posts, pregenerate the user's timelines
	await timeline.pregenerateTimelines(domain, db, cache, actor)

	return new Response('', { status: 200 })
}
