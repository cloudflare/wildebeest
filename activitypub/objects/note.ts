// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import type { Actor } from 'wildebeest/activitypub/actors/'
import * as objects from './'
import { instanceConfig } from 'wildebeest/config/instance'

const NOTE = 'Note'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
export interface Note extends objects.Object {
	content: string
}

// TODO: any way to get TS typing from SQL tables?
export async function createNote(db: D1Database, content: string, originatingActor: Actor): Promise<Note> {
	const properties = {
		content,
	}
	return (await objects.createObject(db, NOTE, properties, new URL(originatingActor.id))) as Note
}
