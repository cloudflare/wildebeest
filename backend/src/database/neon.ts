import * as neon from '@neondatabase/serverless'
import type { Database, Result, QueryBuilder } from 'wildebeest/backend/src/database'
import type { Env } from 'wildebeest/backend/src/types/env'

function sqliteToPsql(query: string): string {
	let c = 0
	return query.replace(/\?([0-9])?/g, (match: string, p1: string) => {
		c += 1
		return `$${p1 || c}`
	})
}

const qb: QueryBuilder = {
	jsonExtract(obj: string, prop: string): string {
		return `jsonb_extract_path(${obj}, '${prop}')::text`
	},

	jsonExtractIsNull(obj: string, prop: string): string {
		return `${qb.jsonExtract(obj, prop)} = 'null'`
	},

	set(array: string): string {
		return `(SELECT value::text FROM json_array_elements_text(${array}))`
	},

	epoch(): string {
		return 'epoch'
	},

	insertOrIgnore(q: string): string {
		return `INSERT ${q} ON CONFLICT DO NOTHING`
	},

	psqlOnly(q: string): string {
		return q
	},

	jsonSet(obj: string, field: string, value: string): string {
		return `jsonb_set(${obj}, '{${field}}', ${value})`
	},
}

export default async function make(env: Pick<Env, 'NEON_DATABASE_URL'>): Promise<Database> {
	const client = new neon.Client(env.NEON_DATABASE_URL)
	await client.connect()

	return {
		client: 'neon',
		qb,

		prepare(query: string) {
			return new PreparedStatement(env, query, [], client)
		},

		dump() {
			throw new Error('not implemented')
		},

		async batch<T = unknown>(statements: PreparedStatement[]): Promise<Result<T>[]> {
			const results = []

			for (let i = 0, len = statements.length; i < len; i++) {
				const query = sqliteToPsql(statements[i].query)
				const result = await client.query(query, statements[i].values)

				results.push({
					results: result.rows as T[],
					success: true,
					meta: {},
				})
			}

			return results
		},

		async exec<T = unknown>(query: string): Promise<Result<T>> {
			throw new Error('not implemented')
			console.log(query)
		},
	}
}

export class PreparedStatement {
	private env: Pick<Env, 'NEON_DATABASE_URL'>
	private client: neon.Client
	public query: string
	public values: any[]

	constructor(env: Pick<Env, 'NEON_DATABASE_URL'>, query: string, values: any[], client: neon.Client) {
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

		const results = await this.client.query(query, this.values)
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
		const results = await this.client.query(query, this.values)

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
