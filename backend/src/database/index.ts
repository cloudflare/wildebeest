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
	qb: QueryBuilder
	prepare(query: string): PreparedStatement
	dump(): Promise<ArrayBuffer>
	batch<T = unknown>(statements: PreparedStatement[]): Promise<Result<T>[]>
	exec<T = unknown>(query: string): Promise<Result<T>>
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
	psql(raw: string): string
	epoch(): string
}

const isTesting = typeof jest !== 'undefined'

export async function getDatabase(env: Env): Promise<Database> {
	if (isTesting) {
		return d1(env)
	} else {
		return neon(env)
	}
}
