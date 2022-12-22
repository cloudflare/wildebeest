import type { Handle } from '../utils/parse'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { getObjectById } from 'wildebeest/backend/src/activitypub/objects'
import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import { instanceConfig } from 'wildebeest/config/instance'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import type { MastodonStatus } from 'wildebeest/backend/src/types'
import { parseHandle } from '../utils/parse'
import { urlToHandle } from '../utils/handle'
import { getLikes } from './like'
import { getReblogs } from './reblog'

export function getMentions(input: string): Array<Handle> {
	const mentions: Array<Handle> = []

	for (let i = 0, len = input.length; i < len; i++) {
		if (input[i] === '@') {
			i++
			let buffer = ''
			while (i < len && /[^\s<]/.test(input[i])) {
				buffer += input[i]
				i++
			}

			mentions.push(parseHandle(buffer))
		}
	}

	return mentions
}

export async function toMastodonStatusFromObject(db: D1Database, obj: Object): Promise<MastodonStatus | null> {
	if (obj.originalActorId === undefined) {
		console.warn('missing `obj.originalActorId`')
		return null
	}

	const actorId = new URL(obj.originalActorId)
	const actor = await actors.get(actorId)

	const acct = urlToHandle(actorId)
	const account = await loadExternalMastodonAccount(acct, actor)

	const favourites = await getLikes(db, obj)
	const reblogs = await getReblogs(db, obj)

	return {
		// Default values
		emojis: [],
		media_attachments: [],
		tags: [],
		mentions: [],

		// TODO: stub values
		visibility: 'public',
		spoiler_text: '',

		content: obj.content || '',
		// Base64 encode the id because it's an URL and Mastodon will misuse it
		// to construct like/reblog/etc URLs
		id: btoa(obj.id),
		uri: obj.url,
		created_at: obj.published || '',
		account,

		favourites_count: favourites.length,
		reblogs_count: reblogs.length,
	}
}

// toMastodonStatusFromRow makes assumption about what field are available on
// the `row` object. This funciton is only used for timelines, which is optimized
// SQL. Otherwise don't use this function.
export async function toMastodonStatusFromRow(db: D1Database, row: any): Promise<MastodonStatus | null> {
	if (row.publisher_actor_id === undefined) {
		console.warn('missing `row.publisher_actor_id`')
		return null
	}
	const properties = JSON.parse(row.properties)
	const actorId = new URL(row.publisher_actor_id)

	const author = actors.personFromRow({
		id: row.actor_id,
		cdate: row.actor_cdate,
		properties: row.actor_properties,
	})

	const acct = urlToHandle(actorId)
	const account = await loadExternalMastodonAccount(acct, author)

	if (row.favourites_count === undefined || row.reblogs_count === undefined) {
		throw new Error('logic error; missing fields.')
	}

	const status: MastodonStatus = {
		// Base64 encode the id because it's an URL and Mastodon will misuse it
		// to construct like/reblog/etc URLs
		id: btoa(row.id),
		uri: objects.uri(row.id),
		created_at: new Date(row.cdate).toISOString(),
		emojis: [],
		media_attachments: [],
		tags: [],
		mentions: [],
		account,

		// TODO: stub values
		visibility: 'public',
		spoiler_text: '',

		content: properties.content,
		favourites_count: row.favourites_count,
		reblogs_count: row.reblogs_count,
	}

	if (properties.updated) {
		status.edited_at = new Date(properties.updated).toISOString()
	}

	// FIXME: add unit tests for reblog
	if (properties.attributedTo && properties.attributedTo !== row.publisher_actor_id) {
		// The actor that introduced the Object in the instance isn't the same
		// as the object has been attributed to. Likely means it's a reblog.

		const actorId = new URL(properties.attributedTo)
		const acct = urlToHandle(actorId)
		const author = await actors.getAndCache(actorId, db)
		const account = await loadExternalMastodonAccount(acct, author)

		// Restore reblogged status
		status.reblog = {
			...status,
			account,
		}
	}

	return status
}

export async function getMastodonStatusById(db: D1Database, id: string): Promise<MastodonStatus | null> {
	const obj = await getObjectById(db, id)
	if (obj === null) {
		return null
	}
	return toMastodonStatusFromObject(db, obj)
}
