import { setActorAlias } from 'wildebeest/backend/src/activitypub/actors'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import * as follow from 'wildebeest/backend/src/activitypub/activities/follow'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { queryAcct } from 'wildebeest/backend/src/webfinger'
import { type Database } from 'wildebeest/backend/src/database'

export async function addAlias(db: Database, alias: string, connectedActor: Actor, userKEK: string, domain: string) {
	const handle = parseHandle(alias)
	const acct = `${handle.localPart}@${handle.domain}`
	if (handle.domain === null) {
		throw new Error("account migration within an instance isn't supported")
	}

	const actor = await queryAcct(handle.domain, db, acct)
	if (actor === null) {
		throw new Error('actor not found')
	}

	await setActorAlias(db, connectedActor.id, actor.id)

	// For Mastodon to deliver the Move Activity we need to be following the
	// "moving from" actor.
	{
		const activity = follow.create(connectedActor, actor)
		const signingKey = await getSigningKey(userKEK, db, connectedActor)
		await deliverToActor(signingKey, connectedActor, actor, activity, domain)
	}
}
