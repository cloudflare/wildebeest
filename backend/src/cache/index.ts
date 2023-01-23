import type { Env } from 'wildebeest/consumer/src'

const CACHE_DO_NAME = 'cachev1'

export interface Cache {
	get<T>(key: string): Promise<T | null>
	put<T>(key: string, value: T): Promise<void>
}

export function cacheFromEnv(env: Env): Cache {
	return {
		async get<T>(key: string): Promise<T | null> {
			const id = env.DO_CACHE.idFromName(CACHE_DO_NAME)
			const stub = env.DO_CACHE.get(id)

			const res = await stub.fetch('http://cache/' + key)
			if (!res.ok) {
				if (res.status === 404) {
					return null
				}

				throw new Error(`DO cache returned ${res.status}: ${await res.text()}`)
			}

			return (await res.json()) as T
		},

		async put<T>(key: string, value: T): Promise<void> {
			const id = env.DO_CACHE.idFromName(CACHE_DO_NAME)
			const stub = env.DO_CACHE.get(id)

			const res = await stub.fetch('http://cache/', {
				method: 'PUT',
				body: JSON.stringify({ key, value }),
			})

			if (!res.ok) {
				throw new Error(`DO cache returned ${res.status}: ${await res.text()}`)
			}
		},
	}
}
