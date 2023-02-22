import * as pg from 'pg'
import type { Database, Result } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'

function sqliteToPsql(query: string): string {
	let c = 0
	return query.replaceAll(/\?([0-9])?/g, (match: string, p1: string) => {
		c += 1
		return `$${p1 || c}`
	})
}

export default function make(env: Env): Database {
	return {
		prepare(query: string) {
			return new PreparedStatement(env, query, [])
		},

		dump() {
			throw new Error('not implemented')
		},

		async batch<T = unknown>(statements: PreparedStatement[]): Promise<Result<T>[]> {
			console.log(statements)
			throw new Error('not implemented')
		},

		async exec<T = unknown>(query: string): Promise<Result<T>> {
			console.log(query)
			throw new Error('not implemented')
		},
	}
}

export class PreparedStatement {
	private env: Env
	private query: string
	private values: any[]

	constructor(env: Env, query: string, values: any[]) {
		this.env = env
		this.query = query
		this.values = values
	}

	bind(...values: any[]): PreparedStatement {
		return new PreparedStatement(this.env, this.query, [...this.values, ...values])
	}

	private async connect() {
		const s = 'postgres://postgres:postgres@127.0.0.1/postgres'
		const client = new pg.Client(s)
		await client.connect()

		return client
	}

	async first<T = unknown>(colName?: string): Promise<T> {
		const conn = await this.connect()
		try {
			if (colName) {
				throw new Error('not implemented')
			}
			const query = sqliteToPsql(this.query)

			console.log(query, this.values)
			const results = await conn.query(query, this.values)
			console.log({ rowCount: results.rowCount })
			if (results.rows.length !== 1) {
				throw new Error(`expected a single row, returned ${results.rows.length} row(s)`)
			}

			return results.rows[0] as T
		} finally {
			await conn.end()
		}
	}

	async run<T = unknown>(): Promise<Result<T>> {
		return this.all()
	}

	async all<T = unknown>(): Promise<Result<T>> {
		const conn = await this.connect()

		try {
			const query = sqliteToPsql(this.query)
			console.log(query, this.values)
			const results = await conn.query(query, this.values)
			console.log({ rowCount: results.rowCount })

			return {
				results: results.rows as T[],
				success: true,
				meta: {},
			}
		} finally {
			await conn.end()
		}
	}

	async raw<T = unknown>(): Promise<T[]> {
		throw new Error('not implemented')
	}
}
