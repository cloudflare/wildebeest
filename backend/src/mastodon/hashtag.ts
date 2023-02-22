import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import type { Tag } from 'wildebeest/backend/src/types/tag'
import { type Database } from 'wildebeest/backend/src/database'

export type Hashtag = string

const HASHTAG_RE = /#([\S]+)/g

export function getHashtags(input: string): Array<Hashtag> {
	const matches = input.matchAll(HASHTAG_RE)
	if (matches === null) {
		return []
	}

	return [...matches].map((match) => match[1])
}

export async function insertHashtags(db: Database, note: Note, values: Array<Hashtag>): Promise<void> {
	const queries = []
	const stmt = db.prepare(`
        INSERT INTO note_hashtags (value, object_id)
        VALUES (?, ?)
    `)

	for (let i = 0, len = values.length; i < len; i++) {
		const value = values[i]
		queries.push(stmt.bind(value, note.id.toString()))
	}

	await db.batch(queries)
}

export async function getTag(db: Database, domain: string, tag: string): Promise<Tag | null> {
	const query = `
        SELECT * FROM note_hashtags WHERE value=?
    `
	const { results, success, error } = await db.prepare(query).bind(tag).all<{ value: string }>()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results || results.length === 0) {
		return null
	}

	return {
		name: results[0].value,
		url: new URL(`/tags/${results[0].value}`, `https://${domain}`),
		history: [],
	}
}
