// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { Link } from 'wildebeest/backend/src/activitypub/objects/link'
import { PUBLIC_GROUP } from 'wildebeest/backend/src/activitypub/activities'
import * as objects from '.'
import { type Database } from 'wildebeest/backend/src/database'

const NOTE = 'Note'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
export interface Note extends objects.APObject {
	content: string
	attributedTo?: string
	summary?: string
	inReplyTo?: string
	replies?: string
	to: Array<string>
	attachment: Array<objects.APObject>
	cc: Array<string>
	tag: Array<Link>
	spoiler_text?: string
}

export async function createPublicNote(
	domain: string,
	db: Database,
	content: string,
	actor: Actor,
	attachments: Array<objects.APObject> = [],
	extraProperties: any = {}
): Promise<Note> {
	const actorId = new URL(actor.id)

	const properties = {
		attributedTo: actorId,
		content,
		to: [PUBLIC_GROUP],
		cc: [actor.followers.toString()],

		// FIXME: stub values
		replies: null,
		sensitive: false,
		summary: null,
		tag: [],

		attachment: attachments,
		inReplyTo: null,
		...extraProperties,
	}

	return (await objects.createObject(domain, db, NOTE, properties, actorId, true)) as Note
}

export async function createDirectNote(
	domain: string,
	db: Database,
	content: string,
	actor: Actor,
	targetActors: Array<Actor>,
	attachment: Array<objects.APObject> = [],
	extraProperties: any = {}
): Promise<Note> {
	const actorId = new URL(actor.id)

	const properties = {
		attributedTo: actorId,
		content,
		to: targetActors.map((a) => a.id.toString()),
		cc: [],

		// FIXME: stub values
		inReplyTo: null,
		replies: null,
		sensitive: false,
		summary: null,
		tag: [],
		attachment,

		...extraProperties,
	}

	return (await objects.createObject(domain, db, NOTE, properties, actorId, true)) as Note
}
