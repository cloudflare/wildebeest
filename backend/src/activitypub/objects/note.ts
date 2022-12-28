// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { Document } from 'wildebeest/backend/src/activitypub/objects'
import { followersURL } from 'wildebeest/backend/src/activitypub/actors'
import * as objects from '.'

const NOTE = 'Note'
export const PUBLIC = 'https://www.w3.org/ns/activitystreams#Public'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
export interface Note extends objects.Object {
	content: string
	attributedTo?: string
	summary?: string
	inReplyTo?: string
	inReplyToAtomUri?: string
	replies?: string
	to: Array<string>
	attachment: Array<Document>
	cc?: Array<string>
	tag?: Array<string>
}

export async function createPublicNote(
	domain: string,
	db: D1Database,
	content: string,
	actor: Actor,
	attachment: Array<Document> = []
): Promise<Note> {
	const actorId = new URL(actor.id)

	const properties = {
		attributedTo: actorId,
		content,
		to: [PUBLIC],
		cc: [followersURL(actorId)],

		// FIXME: stub values
		inReplyTo: null,
		inReplyToAtomUri: null,
		replies: null,
		sensitive: false,
		summary: null,
		tag: [],
		attachment,
	}

	return (await objects.createObject(domain, db, NOTE, properties, actorId, true)) as Note
}
