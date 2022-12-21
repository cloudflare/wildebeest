// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { followersURL } from 'wildebeest/backend/src/activitypub/actors'
import * as objects from '.'
import { instanceConfig } from 'wildebeest/config/instance'

const NOTE = 'Note'
export const PUBLIC = 'https://www.w3.org/ns/activitystreams#Public'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
export interface Note extends objects.Object {
	content: string
	attributedTo?: string
	summary?: string
	inReplyTo?: string
	atomUri?: string
	inReplyToAtomUri?: string
	conversation?: string
	replies?: string
	to: Array<string>
	attachment: Array<string>
	cc?: Array<string>
	tag?: Array<string>
}

export async function createPublicNote(db: D1Database, content: string, actor: Actor): Promise<Note> {
	const actorId = new URL(actor.id)
	const properties = {
		attributedTo: actorId,
		content,
		to: [PUBLIC],
		cc: [followersURL(actorId)],

		// FIXME: stub values
		url: 'https://social.eng.chat/statuses/@todo',
		inReplyTo: null,
		inReplyToAtomUri: null,
		atomUri: actorId + '/' + Date.now(),
		conversation: actorId + '/' + Date.now(),
		replies: null,
		sensitive: false,
		summary: null,
		tag: [],
		attachment: [],
	}

	return (await objects.createObject(db, NOTE, properties, actorId)) as Note
}
