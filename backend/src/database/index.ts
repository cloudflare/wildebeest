import type { Env } from 'wildebeest/backend/src/types/env'
import d1 from './d1'

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
}

export interface PreparedStatement {
	bind(...values: any[]): PreparedStatement
	first<T = unknown>(colName?: string): Promise<T>
	run<T = unknown>(): Promise<Result<T>>
	all<T = unknown>(): Promise<Result<T>>
	raw<T = unknown>(): Promise<T[]>
}

export async function getDatabase(env: Pick<Env, 'DATABASE'>): Promise<Database> {
	return d1(env)
}
