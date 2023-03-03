import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { unwrapPrivateKey } from 'wildebeest/backend/src/utils/key-ops'
import { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { defaultImages } from 'wildebeest/config/accounts'
import * as apOutbox from 'wildebeest/backend/src/activitypub/actors/outbox'
import * as apFollow from 'wildebeest/backend/src/activitypub/actors/follow'
import { type Database } from 'wildebeest/backend/src/database'
import { mastodonAccountStatisticsQuery } from 'wildebeest/backend/src/mastodon/sql/account'

function toMastodonAccount(acct: string, res: Actor): MastodonAccount {
	const avatar: string = res.icon?.url.toString() ?? defaultImages.avatar
	const header: string = res.image?.url.toString() ?? defaultImages.header

	return {
		id: acct,
		username: res.preferredUsername || res.name || 'unnamed',
		acct: acct,
		url: res.url ? res.url.toString() : '',

		display_name: res.name || res.preferredUsername || '',
		note: res.summary || '',
		avatar: avatar,
		avatar_static: avatar,
		header: header,
		header_static: header,
		locked: false,
		fields: [],
		emojis: [],

		bot: false,
		group: false,

		discoverable: true,
		noindex: undefined,
		moved: undefined,
		suspended: undefined,
		limited: undefined,

		created_at: res.published || new Date().toISOString(),
		last_status_at: undefined,
		statuses_count: 0,
		followers_count: 0,
		following_count: 0,
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
	// For local user the acct is only the local part of the email address.
	const acct = res.preferredUsername || 'unknown'
	const account = toMastodonAccount(acct, res)

	const row: any = await calculateMastodonAccountStatistic(res.id.toString(), db)
	account.statuses_count = row.statuses_count
	account.followers_count = row.followers_count
	account.following_count = row.following_count

	return account
}

export async function getSigningKey(instanceKey: string, db: Database, actor: Actor): Promise<CryptoKey> {
	const stmt = db.prepare('SELECT privkey, privkey_salt FROM actors WHERE id=?').bind(actor.id.toString())
	const { privkey, privkey_salt } = (await stmt.first()) as any
	return unwrapPrivateKey(instanceKey, new Uint8Array(privkey), new Uint8Array(privkey_salt))
}

async function calculateMastodonAccountStatistic(actor_id: string, db: Database): Promise<MastodonAccountStatistics> {
	const row: any = await db.prepare(mastodonAccountStatisticsQuery).bind(actor_id, actor_id, actor_id).first()

	return {
		statuses_count: row?.statuses_count ?? 0,
		followers_count: row?.followers_count ?? 0,
		following_count: row?.following_count ?? 0,
	}
}

type MastodonAccountStatistics = {
	statuses_count: number
	followers_count: number
	following_count: number
}
