import { queryAcct } from 'wildebeest/backend/src/webfinger'
import type { MediaAttachment } from 'wildebeest/backend/src/types/media'
import type { UUID } from 'wildebeest/backend/src/types'
import {
	getObjectByMastodonId,
	mastodonIdSymbol,
	originalActorIdSymbol,
} from 'wildebeest/backend/src/activitypub/objects'
import { createPublicNote, type Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import * as media from 'wildebeest/backend/src/media/'
import type { MastodonStatus } from 'wildebeest/backend/src/types'
import { parseHandle } from '../utils/parse'
import { urlToHandle } from '../utils/handle'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import { addObjectInOutbox } from '../activitypub/actors/outbox'
import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { type Database } from 'wildebeest/backend/src/database'

export async function getMentions(input: string, instanceDomain: string, db: Database): Promise<Array<Actor>> {
	const mentions: Array<Actor> = []

	for (let i = 0, len = input.length; i < len; i++) {
		if (input[i] === '@') {
			i++
			let buffer = ''
			while (i < len && /[^\s<]/.test(input[i])) {
				buffer += input[i]
				i++
			}

			const handle = parseHandle(buffer)
			const domain = handle.domain ? handle.domain : instanceDomain
			const acct = `${handle.localPart}@${domain}`
			const targetActor = await queryAcct(domain!, db, acct)
			if (targetActor === null) {
				console.warn(`actor ${acct} not found`)
				continue
			}
			mentions.push(targetActor)
		}
	}

	return mentions
}

export async function toMastodonStatusFromObject(
	db: Database,
	obj: Note,
	domain: string
): Promise<MastodonStatus | null> {
	if (obj[originalActorIdSymbol] === undefined) {
		console.warn('missing `obj.originalActorId`')
		return null
	}

	const actorId = new URL(obj[originalActorIdSymbol])
	const actor = await actors.getAndCache(actorId, db)

	const acct = urlToHandle(actorId)
	const account = await loadExternalMastodonAccount(acct, actor)

	// FIXME: temporarly disable favourites and reblogs counts
	const favourites = []
	const reblogs = []
	// const favourites = await getLikes(db, obj)
	// const reblogs = await getReblogs(db, obj)

	let mediaAttachments: Array<MediaAttachment> = []

	if (Array.isArray(obj.attachment)) {
		mediaAttachments = obj.attachment.map(media.fromObject)
	}

	return {
		// Default values
		emojis: [],
		tags: [],
		mentions: [],
		spoiler_text: obj.spoiler_text ?? '',

		// TODO: stub values
		visibility: 'public',

		media_attachments: mediaAttachments,
		content: obj.content || '',
		id: obj[mastodonIdSymbol] || '',
		uri: obj.id,
		url: new URL(`/@${actor.preferredUsername}/${obj[mastodonIdSymbol]}`, 'https://' + domain),
		created_at: obj.published || '',
		account,

		favourites_count: favourites.length,
		reblogs_count: reblogs.length,
	}
}

// toMastodonStatusFromRow makes assumption about what field are available on
// the `row` object. This function is only used for timelines, which is optimized
// SQL. Otherwise don't use this function.
export async function toMastodonStatusFromRow(domain: string, db: Database, row: any): Promise<MastodonStatus | null> {
	if (row.publisher_actor_id === undefined) {
		console.warn('missing `row.publisher_actor_id`')
		return null
	}
	let properties
	if (typeof row.properties === 'object') {
		// neon uses JSONB for properties which is returned as a deserialized
		// object.
		properties = row.properties
	} else {
		// D1 uses a string for JSON properties
		properties = JSON.parse(row.properties)
	}
	const actorId = new URL(row.publisher_actor_id)

	const author = actors.personFromRow({
		id: row.actor_id,
		cdate: row.actor_cdate,
		properties: row.actor_properties,
	})

	const acct = urlToHandle(actorId)
	const account = await loadExternalMastodonAccount(acct, author)

	if (row.favourites_count === undefined || row.reblogs_count === undefined || row.replies_count === undefined) {
		throw new Error('logic error; missing fields.')
	}

	const mediaAttachments: Array<MediaAttachment> = []

	if (Array.isArray(properties.attachment)) {
		for (let i = 0, len = properties.attachment.length; i < len; i++) {
			const document = properties.attachment[i]
			mediaAttachments.push(media.fromObject(document))
		}
	}

	const status: MastodonStatus = {
		id: row.mastodon_id,
		url: new URL(`/@${author.preferredUsername}/${row.mastodon_id}`, 'https://' + domain),
		uri: row.id,
		created_at: new Date(row.cdate).toISOString(),
		emojis: [],
		media_attachments: mediaAttachments,
		tags: [],
		mentions: [],
		account,
		spoiler_text: properties.spoiler_text ?? '',

		// TODO: stub values
		visibility: 'public',

		content: properties.content,
		favourites_count: row.favourites_count,
		reblogs_count: row.reblogs_count,
		replies_count: row.replies_count,
		reblogged: row.reblogged === 1,
		favourited: row.favourited === 1,
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

export async function getMastodonStatusById(db: Database, id: UUID, domain: string): Promise<MastodonStatus | null> {
	const obj = await getObjectByMastodonId(db, id)
	if (obj === null) {
		return null
	}
	return toMastodonStatusFromObject(db, obj as Note, domain)
}

/**
 * Creates a status object in the given actor's outbox.
 *
 * @param domain the domain to use
 * @param db Database
 * @param actor Author of the reply
 * @param content content of the reply
 * @param attachments optional attachments for the status
 * @param extraProperties optional extra properties for the status
 * @returns the created Note for the status
 */
export async function createStatus(
	domain: string,
	db: Database,
	actor: Person,
	content: string,
	attachments?: APObject[],
	extraProperties?: any
) {
	const note = await createPublicNote(domain, db, content, actor, attachments, extraProperties)
	await addObjectInOutbox(db, actor, note)
	return note
}
