import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { unwrapPrivateKey } from 'wildebeest/backend/src/utils/key-ops'
import { Actor } from '../activitypub/actors'
import { defaultImages } from 'wildebeest/config/accounts'
import * as apOutbox from 'wildebeest/backend/src/activitypub/actors/outbox'
import * as apFollow from 'wildebeest/backend/src/activitypub/actors/follow'
import { type Database } from 'wildebeest/backend/src/database'

function toMastodonAccount(acct: string, res: Actor): MastodonAccount {
	const avatar = res.icon?.url.toString() ?? defaultImages.avatar
	const header = res.image?.url.toString() ?? defaultImages.header

	return {
		acct,

		id: acct,
		username: res.preferredUsername || res.name || 'unnamed',
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

		followers_count: 0,
		following_count: 0,
		statuses_count: 0,
	}
}

// Load an external user, using ActivityPub queries, and return it as a MastodonAccount
export async function loadExternalMastodonAccount(
	acct: string,
	actor: Actor,
	loadStats: boolean = false
): Promise<MastodonAccount> {
	const account = toMastodonAccount(acct, actor)
	if (loadStats === true) {
		account.statuses_count = await apOutbox.countStatuses(actor)
		account.followers_count = await apFollow.countFollowers(actor)
		account.following_count = await apFollow.countFollowing(actor)
	}
	return account
}

// Load a local user and return it as a MastodonAccount
export async function loadLocalMastodonAccount(db: Database, res: Actor): Promise<MastodonAccount> {
	const query = `
SELECT
  (SELECT count(*)
   FROM outbox_objects
   INNER JOIN objects ON objects.id = outbox_objects.object_id
   WHERE outbox_objects.actor_id=?
     AND objects.type = 'Note') AS statuses_count,

  (SELECT count(*)
   FROM actor_following
   WHERE actor_following.actor_id=?) AS following_count,

  (SELECT count(*)
   FROM actor_following
   WHERE actor_following.target_actor_id=?) AS followers_count
  `

	// For local user the acct is only the local part of the email address.
	const acct = res.preferredUsername || 'unknown'
	const account = toMastodonAccount(acct, res)

	const row: any = await db.prepare(query).bind(res.id.toString(), res.id.toString(), res.id.toString()).first()
	account.statuses_count = row.statuses_count
	account.followers_count = row.followers_count
	account.following_count = row.following_count

	return account
}

export async function getSigningKey(instanceKey: string, db: Database, actor: Actor): Promise<CryptoKey> {
	const stmt = db.prepare('SELECT privkey, privkey_salt FROM actors WHERE id=?').bind(actor.id.toString())
	const { privkey, privkey_salt } = (await stmt.first()) as any

	if (privkey.buffer && privkey_salt.buffer) {
		// neon.tech
		return unwrapPrivateKey(instanceKey, new Uint8Array(privkey.buffer), new Uint8Array(privkey_salt.buffer))
	} else {
		// D1
		return unwrapPrivateKey(instanceKey, new Uint8Array(privkey), new Uint8Array(privkey_salt))
	}
}
