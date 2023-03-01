// https://docs.joinmastodon.org/methods/accounts/#get

import { type Database } from 'wildebeest/backend/src/database'
import { actorURL, getActorById } from 'wildebeest/backend/src/activitypub/actors'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import type { Handle } from 'wildebeest/backend/src/utils/parse'
import { queryAcct } from 'wildebeest/backend/src/webfinger/index'
import { loadExternalMastodonAccount, loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { MastodonAccount } from '../types'
import { adjustLocalHostDomain } from '../utils/adjustLocalHostDomain'

export async function getAccount(domain: string, accountId: string, db: Database): Promise<MastodonAccount | null> {
	const handle = parseHandle(accountId)

	if (handle.domain === null || (handle.domain !== null && handle.domain === domain)) {
		// Retrieve the statuses from a local user
		return getLocalAccount(domain, db, handle)
	} else if (handle.domain !== null) {
		// Retrieve the statuses of a remote actor
		const acct = `${handle.localPart}@${handle.domain}`
		return getRemoteAccount(handle, acct, db)
	} else {
		return null
	}
}

async function getRemoteAccount(handle: Handle, acct: string, db: Database): Promise<MastodonAccount | null> {
	// TODO: using webfinger isn't the optimal implementation. We could cache
	// the object in D1 and directly query the remote API, indicated by the actor's
	// url field. For now, let's keep it simple.
	const actor = await queryAcct(handle.domain!, db, acct)
	if (actor === null) {
		return null
	}

	return await loadExternalMastodonAccount(acct, actor, true)
}

async function getLocalAccount(domain: string, db: Database, handle: Handle): Promise<MastodonAccount | null> {
	const actorId = actorURL(adjustLocalHostDomain(domain), handle.localPart)

	const actor = await getActorById(db, actorId)
	if (actor === null) {
		return null
	}

	return await loadLocalMastodonAccount(db, actor)
}
