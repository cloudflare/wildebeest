// https://docs.joinmastodon.org/methods/search/#v2
import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { queryAcct } from 'wildebeest/backend/src/webfinger'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { personFromRow } from 'wildebeest/backend/src/activitypub/actors'
import type { Handle } from 'wildebeest/backend/src/utils/parse'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

type SearchResult = {
	accounts: Array<MastodonAccount>
	statuses: Array<any>
	hashtags: Array<any>
}

export const onRequest: PagesFunction<Env, any> = async ({ request, env }) => {
	return handleRequest(await getDatabase(env), request)
}

export async function handleRequest(db: Database, request: Request): Promise<Response> {
	const url = new URL(request.url)

	if (!url.searchParams.has('q')) {
		return new Response('', { status: 400 })
	}

	const useWebFinger = url.searchParams.get('resolve') === 'true'

	const out: SearchResult = {
		accounts: [],
		statuses: [],
		hashtags: [],
	}

	let query: Handle

	try {
		query = parseHandle(url.searchParams.get('q') || '')
	} catch (err: any) {
		return new Response('', { status: 400 })
	}

	if (useWebFinger && query.domain !== null) {
		const acct = `${query.localPart}@${query.domain}`
		const res = await queryAcct(query.domain, db, acct)
		if (res !== null) {
			out.accounts.push(await loadExternalMastodonAccount(acct, res))
		}
	}

	if (query.domain === null) {
		const sql = `
          SELECT actors.* FROM actors
          WHERE rowid IN (SELECT rowid FROM search_fts WHERE (preferredUsername MATCH ? OR name MATCH ?) AND type='Person' ORDER BY rank LIMIT 10)
        `

		try {
			const { results, success, error } = await db
				.prepare(sql)
				.bind(query.localPart + '*', query.localPart + '*')
				.all()
			if (!success) {
				throw new Error('SQL error: ' + error)
			}

			if (results !== undefined) {
				for (let i = 0, len = results.length; i < len; i++) {
					const row: any = results[i]
					const actor = personFromRow(row)
					const acct = urlToHandle(new URL(row.id))
					out.accounts.push(await loadExternalMastodonAccount(acct, actor))
				}
			}
		} catch (err: any) {
			console.warn(`failed to search: ${err.stack}`)
		}
	}

	return new Response(JSON.stringify(out), { headers })
}
