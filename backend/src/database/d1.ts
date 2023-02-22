import { type Database, QueryBuilder } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'

const qb: QueryBuilder = {
	jsonExtract(obj: string, prop: string): string {
		return `json_extract(${obj}, '$.${prop}')`
	},

	jsonExtractIsNull(obj: string, prop: string): string {
		return `${qb.jsonExtract(obj, prop)} IS NULL`
	},

	set(array: string): string {
		return `(SELECT value FROM json_each(${array}))`
	},

	psql(raw: string): string {
		return ''
	},

	epoch(): string {
		return '00-00-00 00:00:00'
	},
}

export default function make(env: Env): Database {
	const db = env.DATABASE as any
	db.qb = qb

	return db as Database
}
