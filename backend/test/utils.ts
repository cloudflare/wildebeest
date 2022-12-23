import { BetaDatabase } from '@miniflare/d1'
import { strict as assert } from 'node:assert/strict'
import { promises as fs } from 'fs'
import * as Database from 'better-sqlite3'

export function isUrlValid(s: string) {
	let url
	try {
		url = new URL(s)
	} catch (err) {
		return false
	}
	return url.protocol === 'https:'
}

export async function makeDB(): Promise<any> {
	const db = new BetaDatabase(new Database(':memory:'))!

	// Manually run our migrations since @miniflare/d1 doesn't support it (yet).
	{
		const initial = await fs.readFile('./migrations/0000_initial.sql', 'utf-8')

		const stmts = initial.split(';')
		for (let i = 1, len = stmts.length; i < len; i++) {
			const stmt = stmts[i].replace(/(\r\n|\n|\r)/gm, '')
			try {
				await db.exec(stmt)
			} catch (err) {
				console.log('could not run statement: ', stmt)
				throw err
			}
		}
	}

	return db
}

export function assertCORS(response: Response) {
	assert(response.headers.has('Access-Control-Allow-Origin'))
	assert(response.headers.has('Access-Control-Allow-Headers'))
}

export function assertJSON(response: Response) {
	assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
}

export function assertCache(response: Response, maxge: number) {
	assert(response.headers.has('cache-control'))
	assert(response.headers.get('cache-control')!.includes('max-age=' + maxge))
}

export async function streamToArrayBuffer(stream: ReadableStream) {
	let result = new Uint8Array(0)
	const reader = stream.getReader()
	while (true) {
		const { done, value } = await reader.read()
		if (done) {
			break
		}

		const newResult = new Uint8Array(result.length + value.length)
		newResult.set(result)
		newResult.set(value, result.length)
		result = newResult
	}
	return result
}
