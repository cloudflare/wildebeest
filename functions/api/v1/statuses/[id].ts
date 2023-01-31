// https://docs.joinmastodon.org/methods/statuses/#get

import { type Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { UUID } from 'wildebeest/backend/src/types'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getMastodonStatusById, toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ params, env, request }) => {
	const domain = new URL(request.url).hostname
	return handleRequestGet(env.DATABASE, params.id as UUID, domain)
}

export const onRequestDelete: PagesFunction<Env, any, ContextData> = async ({ params, env, request, data }) => {
	const domain = new URL(request.url).hostname
	return handleRequestDelete(env.DATABASE, params.id as UUID, data.connectedActor, domain)
}

export async function handleRequestGet(db: D1Database, id: UUID, domain: string): Promise<Response> {
	const status = await getMastodonStatusById(db, id, domain)
	if (status === null) {
		return new Response('', { status: 404 })
	}

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(status), { headers })
}

// TODO: eventually use SQLite's `ON DELETE CASCADE` but requires writing the DB
// schema directly into D1, which D1 disallows at the moment.
// Some context at: https://stackoverflow.com/questions/13150075/add-on-delete-cascade-behavior-to-an-sqlite3-table-after-it-has-been-created
async function deleteNote(db: D1Database, note: Note) {
	const deleteOutboxObject = db.prepare('DELETE FROM outbox_objects WHERE id=?').bind(note.id.toString())
	const deleteObject = db.prepare('DELETE FROM objects WHERE id=?').bind(note.id.toString())

	const res = await db.batch([deleteOutboxObject, deleteObject])

	for (let i = 0, len = res.length; i < len; i++) {
		if (!res[i].success) {
			throw new Error('SQL error: ' + res[i].error)
		}
	}
}

export async function handleRequestDelete(
	db: D1Database,
	id: UUID,
	connectedActor: Person,
	domain: string
): Promise<Response> {
	const obj = (await getObjectByMastodonId(db, id)) as Note
	if (obj === null) {
		return errors.statusNotFound(id)
	}

	const status = await toMastodonStatusFromObject(db, obj, domain)
	if (status === null) {
		return errors.statusNotFound(id)
	}
	if (status.account.id !== urlToHandle(connectedActor.id)) {
		return errors.statusNotFound(id)
	}

	await deleteNote(db, obj)

	// FIXME: deliver a Delete message to the Actor followers and our peers

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(status), { headers })
}
