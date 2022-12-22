import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { unwrapPrivateKey } from 'wildebeest/backend/src/utils/key-ops'
import type { Actor } from '../activitypub/actors'
import { defaultImages } from 'wildebeest/config/accounts'
import { getFollowingAcct, getFollowers } from 'wildebeest/backend/src/mastodon/follow'
import * as apOutbox from 'wildebeest/backend/src/activitypub/actors/outbox'
import * as apFollow from 'wildebeest/backend/src/activitypub/actors/follow'

async function getStatusesCount(db: D1Database, actorId: URL): Promise<number> {
	const query = `
SELECT count(*) as count
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE outbox_objects.actor_id=? AND objects.type = 'Note'
  `

	const row: any = await db.prepare(query).bind(actorId.toString()).first()
	return row.count
}

function toMastodonAccount(acct: string, res: Actor): MastodonAccount {
	let avatar = defaultImages.avatar
	let header = defaultImages.header

	if (res.icon !== undefined && typeof res.icon.url === 'string') {
		avatar = res.icon.url
	}
	if (res.image !== undefined && typeof res.image.url === 'string') {
		header = res.image.url
	}

	return {
		acct,

		id: acct,
		username: res.preferredUsername || res.id,
		url: res.url ? res.url.toString() : '',
		display_name: res.name || res.preferredUsername || '',
		note: res.summary || '',
		created_at: res.published || new Date().toISOString(),

		avatar,
		avatar_static: avatar,

		header,
		header_static: header,

		locked: false,
		bot: false,
		discoverable: true,
		group: false,

		emojis: [],
		fields: [],
	}
}

// Load an external user, using ActivityPub queries, and return it as a MastodonAccount
export async function loadExternalMastodonAccount(
	acct: string,
	res: Actor,
	loadStats: boolean = false
): Promise<MastodonAccount> {
	const account = toMastodonAccount(acct, res)
	if (loadStats === true) {
		account.statuses_count = (await apOutbox.getMetadata(res)).totalItems
		account.followers_count = (await apFollow.getFollowersMetadata(res)).totalItems
		account.following_count = (await apFollow.getFollowingMetadata(res)).totalItems
	}
	return account
}

// Load a local user and return it as a MastodonAccount
export async function loadLocalMastodonAccount(db: D1Database, res: Actor): Promise<MastodonAccount> {
	// For local user the acct is only the local part of the email address.
	const acct = res.preferredUsername || 'unknown'
	const account = toMastodonAccount(acct, res)
	account.statuses_count = await getStatusesCount(db, new URL(res.id))
	account.followers_count = (await getFollowers(db, res)).length
	account.following_count = (await getFollowingAcct(db, res)).length

	return account
}

export async function getSigningKey(instanceKey: string, db: D1Database, user: Actor): Promise<CryptoKey> {
	const stmt = db.prepare('SELECT privkey, privkey_salt FROM actors WHERE id=?').bind(user.id)
	const { privkey, privkey_salt } = (await stmt.first()) as any
	return unwrapPrivateKey(instanceKey, new Uint8Array(privkey), new Uint8Array(privkey_salt))
}
