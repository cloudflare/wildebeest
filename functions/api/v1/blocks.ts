const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest = async () => {
	const out: Array<any> = []
	return new Response(JSON.stringify(out), { headers })
}
