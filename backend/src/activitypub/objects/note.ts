// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { followersURL } from 'wildebeest/backend/src/activitypub/actors'
import { PUBLIC_GROUP } from 'wildebeest/backend/src/activitypub/activities'
import * as objects from '.'

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
	cc?: Array<string>
	tag?: Array<string>
}

export async function createPublicNote(
	domain: string,
	db: D1Database,
	content: string,
	actor: Actor,
	attachment: Array<objects.APObject> = [],
	extraProperties: any = {}
): Promise<Note> {
	const actorId = new URL(actor.id)

	const properties = {
		attributedTo: actorId,
		content,
		to: [PUBLIC_GROUP],
		cc: [followersURL(actorId)],

		// FIXME: stub values
		replies: null,
		sensitive: false,
		summary: null,
		tag: [],
		attachment,

		inReplyTo: null,
		...extraProperties,
	}

	return (await objects.createObject(domain, db, NOTE, properties, actorId, true)) as Note
}

export async function createPrivateNote(
	domain: string,
	db: D1Database,
	content: string,
	actor: Actor,
	targetActor: Actor,
	attachment: Array<objects.APObject> = [],
	extraProperties: any = {}
): Promise<Note> {
	const actorId = new URL(actor.id)

	const properties = {
		attributedTo: actorId,
		content,
		to: [targetActor.id.toString()],
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
