// https://docs.joinmastodon.org/methods/oauth/#token

type Body = {
    code: string | null
}

export const onRequest: PagesFunction<unknown, any> = async ({ request }) => {
    return handleRequest(request)
}

export async function handleRequest(request: Request): Promise<Response> {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, authorization',
        'content-type': 'application/json; charset=utf-8',
    }

    const { code } = await request.json<Body>()
    if (!code) {
        return new Response('', { status: 401, headers })
    }

    const res = {
        access_token: code,
        token_type: 'Bearer',
        scope: 'read write follow push', // hardcoded by the Mastodon app. TODO: get from /oauth/authorize call.
        created_at: (Date.now() / 1000) | 0,
    }
    return new Response(JSON.stringify(res), { headers })
}
