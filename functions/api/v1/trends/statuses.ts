// https://docs.joinmastodon.org/methods/trends/#statuses

import type { MastodonStatus } from 'wildebeest/backend/src/types'

const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest = async () => {
	const out: Array<MastodonStatus> = []
	return new Response(JSON.stringify(out), { headers })
}
