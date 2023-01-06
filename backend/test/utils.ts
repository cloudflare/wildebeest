import { strict as assert } from 'node:assert/strict'
import { createClient } from 'wildebeest/backend/src/mastodon/client'
import type { Client } from 'wildebeest/backend/src/mastodon/client'
import { promises as fs } from 'fs'
import { BetaDatabase } from '@miniflare/d1'
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
	const db = new Database(':memory:')
	const db2 = new BetaDatabase(db)!

	// Manually run our migrations since @miniflare/d1 doesn't support it (yet).
	const initial = await fs.readFile('./migrations/0000_initial.sql', 'utf-8')
	await db.exec(initial)

	return db2
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
	let { done, value } = await reader.read()
	while (!done) {
		const newResult = new Uint8Array(result.length + value.length)
		newResult.set(result)
		newResult.set(value, result.length)
		result = newResult

		const nextItem = await reader.read()
		done = nextItem.done
		value = nextItem.value
	}
	return result
}

export async function createTestClient(
	db: D1Database,
	redirectUri: string = 'https://localhost',
	scopes: string = 'read follow'
): Promise<Client> {
	return createClient(db, 'test client', redirectUri, 'https://cloudflare.com', scopes)
}
