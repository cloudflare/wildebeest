// https://docs.joinmastodon.org/methods/search/#v2
import { queryAcct } from 'wildebeest/webfinger/'
import { MastodonAccount } from 'wildebeest/types/account'
import { parseHandle } from 'wildebeest/utils/parse'

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

export const onRequest: PagesFunction<unknown, any> = ({ request }) => {
    return handleRequest(request)
}

export async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (!url.searchParams.has('q')) {
        return new Response('', { status: 400 })
    }

    const useWebFinger = url.searchParams.get('resolve') === 'true'

    const results: SearchResult = {
        accounts: [],
        statuses: [],
        hashtags: [],
    }

    const query = parseHandle(url.searchParams.get('q') || '')
    if (useWebFinger && query.domain !== null) {
        const acct = `${query.localPart}@${query.domain}`
        const res = await queryAcct(query.domain, acct)
        if (res !== null) {
            results.accounts.push(res)
        }
    }

    return new Response(JSON.stringify(results), { headers })
}
