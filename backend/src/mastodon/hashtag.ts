import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'

export type Hashtag = string

const HASHTAG_RE = /#([\S]+)/g

export function getHashtags(input: string): Array<Hashtag> {
	const matches = input.matchAll(HASHTAG_RE)
	if (matches === null) {
		return []
	}

	return [...matches].map((match) => match[1])
}

export async function insertHashtags(db: D1Database, note: Note, values: Array<Hashtag>): Promise<void> {
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
