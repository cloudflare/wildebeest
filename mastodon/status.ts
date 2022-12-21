import type { Handle } from '../utils/parse'
import { getPersonById } from 'wildebeest/activitypub/actors'
import { getObjectById } from 'wildebeest/activitypub/objects'
import type { Object } from 'wildebeest/activitypub/objects/'
import { instanceConfig } from 'wildebeest/config/instance'
import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import * as actors from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import { parseHandle } from '../utils/parse'
import { urlToHandle } from '../utils/handle'
import { getLikes } from './like'
import { getReblogs } from './reblog'

export function getMentions(input: string): Array<Handle> {
	const mentions: Array<Handle> = []

	for (let i = 0, len = input.length; i < len; i++) {
		if (input[i] === '@') {
			let buffer = ''
			for (; ; i++) {
				if (input[i] === ' ') {
					break
				}
				buffer += input[i]
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
	const account = loadExternalMastodonAccount(acct, actor)

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
		id: obj.id,
		uri: obj.url,
		created_at: obj.published || '',
		account,

		favourites_count: favourites.length,
		reblogs_count: reblogs.length,
	}
}

export async function toMastodonStatusFromRow(db: D1Database, row: any): Promise<MastodonStatus | null> {
	if (row.publisher_actor_id === undefined) {
		console.warn('missing `row.publisher_actor_id`')
		return null
	}
	const properties = JSON.parse(row.properties)
	const actorId = new URL(row.publisher_actor_id)

	const author = await getPersonById(db, actorId)
	if (author === null) {
		console.error('note author is unknown')
		return null
	}

	const acct = urlToHandle(actorId)
	const account = loadExternalMastodonAccount(acct, author)

	const obj: any = {
		// likes and reblogs can be retrieve only with the object id, we don't
		// need to load the full object.
		id: row.id,
	}
	const favourites = await getLikes(db, obj)
	const reblogs = await getReblogs(db, obj)

	const status: MastodonStatus = {
		// Default values
		id: row.id,
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
		favourites_count: favourites.length,
		reblogs_count: reblogs.length,
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
		const account = loadExternalMastodonAccount(acct, author)

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
