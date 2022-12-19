// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import * as objects from './'
import { instanceConfig } from 'wildebeest/config/instance'

const NOTE = 'Note'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
export interface Note extends objects.Object {
	content: string
}

// TODO: any way to get TS typing from SQL tables?
export async function createNote(db: D1Database, content: string): Promise<Note> {
	const properties = {
		content,
	}
	return (await objects.createObject(db, NOTE, properties)) as Note
}
