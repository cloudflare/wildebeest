import { cors } from 'wildebeest/backend/src/utils/cors'

export const onRequest = async () => {
	// prettier-ignore
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'max-age=300, public',
		...cors()
	}
	const res: any = []
	return new Response(JSON.stringify(res), { headers })
}
