import * as neon from '@neondatabase/serverless'
import type { Database, Result, QueryBuilder } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'

function sqliteToPsql(query: string): string {
	let c = 0
	return query.replaceAll(/\?([0-9])?/g, (match: string, p1: string) => {
		c += 1
		return `$${p1 || c}`
	})
}

const qb: QueryBuilder = {
	jsonExtract(obj: string, prop: string): string {
		return `json_extract_path(${obj}::json, '${prop}')::text`
	},

	jsonExtractIsNull(obj: string, prop: string): string {
		return `${qb.jsonExtract(obj, prop)} = 'null'`
	},

	set(array: string): string {
		return `(SELECT value::text FROM json_array_elements_text(${array}))`
	},

	psql(raw: string): string {
		return raw
	},

	epoch(): string {
		return 'epoch'
	},
}

export default async function make(env: Env): Promise<Database> {
	const client = new neon.Client(env.NEON_DATABASE_URL!)
	console.log(env.NEON_DATABASE_URL!)
	await client.connect()

	return {
		qb,

		prepare(query: string) {
			return new PreparedStatement(env, query, [], client)
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
	private client: neon.Client
	private query: string
	private values: any[]

	constructor(env: Env, query: string, values: any[], client: neon.Client) {
		this.env = env
		this.query = query
		this.values = values
		this.client = client
	}

	bind(...values: any[]): PreparedStatement {
		return new PreparedStatement(this.env, this.query, [...this.values, ...values], this.client)
	}

	async first<T = unknown>(colName?: string): Promise<T> {
		if (colName) {
			throw new Error('not implemented')
		}
		const query = sqliteToPsql(this.query)

		console.log(query, this.values)
		const results = await this.client.query(query, this.values)
		console.log({ results })
		if (results.rows.length !== 1) {
			throw new Error(`expected a single row, returned ${results.rows.length} row(s)`)
		}

		return results.rows[0] as T
	}

	async run<T = unknown>(): Promise<Result<T>> {
		return this.all()
	}

	async all<T = unknown>(): Promise<Result<T>> {
		const query = sqliteToPsql(this.query)
		console.log(query, this.values)
		const results = await this.client.query(query, this.values)
		console.log({ results })

		return {
			results: results.rows as T[],
			success: true,
			meta: {},
		}
	}

	async raw<T = unknown>(): Promise<T[]> {
		throw new Error('not implemented')
	}
}
