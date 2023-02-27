import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { getVAPIDKeys } from 'wildebeest/backend/src/config'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { InboxMessageBody } from 'wildebeest/backend/src/types/queue'
import { MessageType } from 'wildebeest/backend/src/types/queue'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import { parseRequest } from 'wildebeest/backend/src/utils/httpsigjs/parser'
import { fetchKey, verifySignature } from 'wildebeest/backend/src/utils/httpsigjs/verifier'
import { generateDigestHeader } from 'wildebeest/backend/src/utils/http-signing-cavage'

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
	try {
		const parsedSignature = parseRequest(request)
		const pubKey = await fetchKey(parsedSignature)
		if (pubKey === null) {
			return new Response('signature key not found', { status: 401 })
		}
		const valid = await verifySignature(parsedSignature, pubKey)
		if (!valid) {
			return new Response('invalid signature', { status: 401 })
		}
	} catch (err: unknown) {
		console.warn((err as any).stack)
		return new Response('signature verification failed', { status: 401 })
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
	return handleRequest(
		domain,
		await getDatabase(env),
		params.id as string,
		activity,
		env.QUEUE,
		env.userKEK,
		getVAPIDKeys(env)
	)
}

export async function handleRequest(
	domain: string,
	db: Database,
	id: string,
	activity: Activity,
	queue: Queue<InboxMessageBody>,
	userKEK: string,
	vapidKeys: JWK
): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain !== null && handle.domain !== domain) {
		return new Response('', { status: 403 })
	}
	const actorId = actorURL(domain, handle.localPart)

	const actor = await actors.getActorById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	await queue.send({
		type: MessageType.Inbox,
		actorId: actor.id.toString(),
		activity,
		userKEK,
		vapidKeys,
	})

	return new Response('', { status: 200 })
}
