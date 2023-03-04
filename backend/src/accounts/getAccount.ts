// https://docs.joinmastodon.org/methods/accounts/#get

import { type Database } from 'wildebeest/backend/src/database'
import { parseHandle, type Handle } from 'wildebeest/backend/src/utils/parse'
import { isHandle, urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { isNumeric } from 'wildebeest/backend/src/utils/id'
import { queryAcct } from 'wildebeest/backend/src/webfinger/index'
import { loadExternalMastodonAccount, loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { MastodonAccount } from 'wildebeest/backend/src/types'
// import { adjustLocalHostDomain } from '../utils/adjustLocalHostDomain'
import { findMastodonAccountIDByEmailQuery } from 'wildebeest/backend/src/mastodon/sql/account'

export async function getAccount(
	localDomain: string,
	mastodonAcctOrAPObjectId: string,
	db: Database
): Promise<MastodonAccount | null> {
	if (isHandle(mastodonAcctOrAPObjectId)) {
		const handle: Handle = parseHandle(mastodonAcctOrAPObjectId)
		return await _getAccount(handle, localDomain, db)
	} else if (isNumeric(mastodonAcctOrAPObjectId)) {
		console.error(`NOT IMPLEMENTED - MASTODON ID: ${mastodonAcctOrAPObjectId}`)
		return null
	} else {
		try {
			const apObjectId: URL = new URL(mastodonAcctOrAPObjectId)
			const handle: Handle = parseHandle(urlToHandle(apObjectId))
			return await _getAccount(handle, localDomain, db)
		} catch {
			console.error(`Unrecognized account identified: ${mastodonAcctOrAPObjectId}`)
			return null
		}
	}
}

async function _getAccount(handle: Handle, localDomain: string, db: Database): Promise<MastodonAccount | null> {
	if (handle.domain !== null && handle.domain !== localDomain) {
		return await getRemoteAccount(handle, localDomain, db)
	} else if (handle.domain === null || handle.domain === localDomain) {
		handle.domain = localDomain
		return await getLocalAccount(handle, localDomain, db)
	} else {
		console.error(
			`Unable to find account 'handle.localPart' = ${handle.localPart} and 'handle.domain' = ${handle.domain}`
		)
		return null
	}
}

async function getRemoteAccount(handle: Handle, localDomain: string, db: Database): Promise<MastodonAccount | null> {
	const acct = `${handle.localPart}@${handle.domain}`
	// TODO: using webfinger isn't the optimal implementation. We could cache
	// the object in D1 and directly query the remote API, indicated by the actor's
	// url field. For now, let's keep it simple.
	const actor = await queryAcct(handle.domain!, db, acct)
	if (actor === null) {
		return null
	}

	return await loadExternalMastodonAccount(acct, actor, true)
}

async function getLocalAccount(handle: Handle, localDomain: string, db: Database): Promise<MastodonAccount | null> {
	// const handle = parseHandle(mastodonAcctOrAPObjectId)
	// const actorId = actorURL(adjustLocalHostDomain(domain), handle.localPart)

	// const actor = await getActorById(db, actorId)
	// if (actor === null) {
	// 	return null
	// }

	return await loadLocalMastodonAccount(handle, localDomain, db)
}

export async function getAccountByEmail(domain: string, email: string, db: Database): Promise<MastodonAccount | null> {
	const row: any = await db.prepare(findMastodonAccountIDByEmailQuery).bind(email).first()

	return await getAccount(domain, row?.id, db)
}
