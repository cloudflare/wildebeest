import type { Env } from 'wildebeest/backend/src/types/env'
import d1 from './d1'
import neon from './neon'

export interface Result<T = unknown> {
	results?: T[]
	success: boolean
	error?: string
	meta: any
}

export interface Database {
	prepare(query: string): PreparedStatement
	dump(): Promise<ArrayBuffer>
	batch<T = unknown>(statements: PreparedStatement[]): Promise<Result<T>[]>
	exec<T = unknown>(query: string): Promise<Result<T>>
	qb: QueryBuilder
	client: string
}

export interface PreparedStatement {
	bind(...values: any[]): PreparedStatement
	first<T = unknown>(colName?: string): Promise<T>
	run<T = unknown>(): Promise<Result<T>>
	all<T = unknown>(): Promise<Result<T>>
	raw<T = unknown>(): Promise<T[]>
}

export interface QueryBuilder {
	jsonExtract(obj: string, prop: string): string
	jsonExtractIsNull(obj: string, prop: string): string
	set(array: string): string
	epoch(): string
	insertOrIgnore(q: string): string
	psqlOnly(raw: string): string
	jsonSet(obj: string, field: string, value: string): string
}

export async function getDatabase(env: Pick<Env, 'DATABASE' | 'NEON_DATABASE_URL'>): Promise<Database> {
	if (env.NEON_DATABASE_URL !== undefined) {
		return neon(env)
	}

	return d1(env)
}
