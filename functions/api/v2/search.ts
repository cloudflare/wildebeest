// https://docs.joinmastodon.org/methods/search/#v2
import type { Env } from 'wildebeest/backend/src/types/env'
import { queryAcct } from 'wildebeest/backend/src/webfinger'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'

const headers = {
	'content-type': 'application/json; charset=utf-8',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
}

type SearchResult = {
	accounts: Array<MastodonAccount>
	statuses: Array<any>
	hashtags: Array<any>
}

export const onRequest: PagesFunction<Env, any> = async ({ request, env }) => {
	return handleRequest(env.DATABASE, request)
}

export async function handleRequest(db: D1Database, request: Request): Promise<Response> {
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

	const query = parseHandle(url.searchParams.get('q') || '')
	if (useWebFinger && query.domain !== null) {
		const acct = `${query.localPart}@${query.domain}`
		const res = await queryAcct(query.domain, acct)
		if (res !== null) {
			out.accounts.push(await loadExternalMastodonAccount(acct, res))
		}
	}

	if (query.domain === null) {
		const sql = `
          SELECT * FROM actors
          WHERE
            json_extract(actors.properties, '$.name') LIKE ?
            OR json_extract(actors.properties, '$.preferredUsername') LIKE ?
          LIMIT 10
        `
		const { results, success, error } = await db.prepare(sql).bind(`%${query.localPart}%`, `%${query.localPart}%`).all()
		if (!success) {
			throw new Error('SQL error: ' + error)
		}

		if (results !== undefined) {
			for (let i = 0, len = results.length; i < len; i++) {
				const row: any = results[i]
				const acct = urlToHandle(new URL(row.id))
				out.accounts.push(await loadExternalMastodonAccount(acct, row))
			}
		}
	}

	return new Response(JSON.stringify(out), { headers })
}
