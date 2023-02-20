import type { Env } from 'wildebeest/backend/src/types/env'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import * as follow from 'wildebeest/backend/src/activitypub/activities/follow'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ env, request, data }) => {
	const domain = new URL(request.url).hostname
	return handleRequestPost(env.DATABASE, request, data.connectedActor, env.userKEK, domain)
}

type AddRelayRequest = {
	actor: string
}

export async function handleRequestPost(
	db: D1Database,
	request: Request,
	connectedActor: Person,
	userKEK: string,
	domain: string
): Promise<Response> {
	const body = await request.json<AddRelayRequest>()

	// download actor
	const actorId = new URL(body.actor)
	const targetActor = await actors.getAndCache(actorId, db)

	// add relay
	{
		const id = crypto.randomUUID()
		await db
			.prepare(
				`
                    INSERT INTO relays (id, actor_id)
                    VALUES (?, ?)
                `
			)
			.bind(id, targetActor.id.toString())
			.run()
	}

	// follow relay
	{
		const activity = follow.create(connectedActor, targetActor)
		const signingKey = await getSigningKey(userKEK, db, connectedActor)
		await deliverToActor(signingKey, connectedActor, targetActor, activity, domain)
	}

	return new Response('', { status: 201 })
}
