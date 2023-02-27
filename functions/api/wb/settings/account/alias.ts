import type { Env } from 'wildebeest/backend/src/types/env'
import { setActorAlias } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { queryAcct } from 'wildebeest/backend/src/webfinger'
import * as errors from 'wildebeest/backend/src/errors'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ env, request, data }) => {
	return handleRequestPost(await getDatabase(env), request, data.connectedActor)
}

type AddAliasRequest = {
	alias: string
}

export async function handleRequestPost(db: Database, request: Request, connectedActor: Actor): Promise<Response> {
	const body = await request.json<AddAliasRequest>()

	const handle = parseHandle(body.alias)
	const acct = `${handle.localPart}@${handle.domain}`
	if (handle.domain === null) {
		console.warn("account migration within an instance isn't supported")
		return new Response('', { status: 400 })
	}
	const actor = await queryAcct(handle.domain, db, acct)
	if (actor === null) {
		return errors.resourceNotFound('actor', acct)
	}

	await setActorAlias(db, connectedActor.id, actor.id)

	return new Response('', { status: 201 })
}
