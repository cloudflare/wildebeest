export interface Env {
	DO: DurableObjectNamespace
}

export default {
	async fetch(request: Request, env: Env) {
		try {
			const id = env.DO.idFromName('default')
			const obj = env.DO.get(id)
			return obj.fetch(request)
		} catch (err: any) {
			return new Response(err.stack, { status: 500 })
		}
	},
}

export class WildebeestCache {
	private storage: DurableObjectStorage

	constructor(state: DurableObjectState) {
		this.storage = state.storage
	}

	async fetch(request: Request) {
		if (request.method === 'GET') {
			const { pathname } = new URL(request.url)
			const key = pathname.slice(1) // remove the leading slash from path

			const value = await this.storage.get(key)
			if (value === undefined) {
				console.log(`Get ${key} MISS`)
				return new Response('', { status: 404 })
			}

			console.log(`Get ${key} HIT`)
			return new Response(JSON.stringify(value))
		}

		if (request.method === 'PUT') {
			const { key, value } = await request.json<any>()
			console.log(`Set ${key}`)

			await this.storage.put(key, value)
			return new Response('', { status: 201 })
		}

		return new Response('', { status: 400 })
	}
}
