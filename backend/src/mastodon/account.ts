import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { unwrapPrivateKey } from 'wildebeest/backend/src/utils/key-ops'
import { getPersonByMastodonAcct, Actor, WBActor, Person } from 'wildebeest/backend/src/activitypub/actors'
import { parseHandle, type Handle } from 'wildebeest/backend/src/utils/parse'
import { isHandle } from 'wildebeest/backend/src/utils/handle'
import { defaultImages } from 'wildebeest/config/accounts'
import * as apOutbox from 'wildebeest/backend/src/activitypub/actors/outbox'
import * as apFollow from 'wildebeest/backend/src/activitypub/actors/follow'
import { type Database } from 'wildebeest/backend/src/database'
import { mastodonAccountStatisticsQuery } from 'wildebeest/backend/src/mastodon/sql/account'

function toMastodonAccount(handle: Handle, localDomain: string, person: WBActor): MastodonAccount {
	const avatar: string = person.icon?.url.toString() ?? defaultImages.avatar
	const header: string = person.image?.url.toString() ?? defaultImages.header

	return {
		id: person.mastodon_id!,
		username: handle.localPart,
		acct:
			handle.domain === null || handle.domain === localDomain
				? handle.localPart
				: `${handle.localPart}@${handle.domain}`,
		url: person.url ? person.url.toString() : '',

		display_name: person.name || person.preferredUsername || '',
		note: person.summary || '',
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

		created_at: person.published || new Date().toISOString(),
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
): Promise<MastodonAccount | null> {
	if (!isHandle(acct)) {
		const message: string = `'acct' must be a handle: 'acct' === ${acct}`
		console.error(message)
		return null
	}

	const handle: Handle = parseHandle(acct)
	const account = toMastodonAccount(handle, '', actor as WBActor)
	if (loadStats === true) {
		account.statuses_count = await apOutbox.countStatuses(actor)
		account.followers_count = await apFollow.countFollowers(actor)
		account.following_count = await apFollow.countFollowing(actor)
	}

	return account
}

// Load a local user and return it as a MastodonAccount
export async function loadLocalMastodonAccount(
	handle: Handle,
	localDomain: string,
	db: Database
): Promise<MastodonAccount | null> {
	if (handle.domain === null || handle.domain !== localDomain) {
		const message: string = `'handle.domain' must be equal to 'localDomain' for local accounts: ${handle.domain} !== ${localDomain}`
		console.warn(message)
		return null
	}

	const person: Person | null = await getPersonByMastodonAcct(handle.localPart, db)
	if (person === null) {
		const message: string = `Mastodon account not found: '${handle.localPart}'`
		console.warn(message)
		return null
	}

	const account = toMastodonAccount(handle, localDomain, person)

	const stats: MastodonAccountStatistics = await calculateMastodonAccountStatistic(person.id.toString(), db)
	account.statuses_count = stats.statuses_count
	account.followers_count = stats.followers_count
	account.following_count = stats.following_count

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
