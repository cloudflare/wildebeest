import { component$ } from '@builder.io/qwik'
import * as access from 'wildebeest/backend/src/access'
import type { Client } from 'wildebeest/backend/src/mastodon/client'
import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { WildebeestLogo } from '~/components/MastodonLogo'

export const clientLoader = loader$<{ DATABASE: D1Database }, Promise<Client>>(async ({ platform, query }) => {
	const client_id = query.get('client_id') || ''
	const client = await getClientById(platform.DATABASE, client_id)
	if (client === null) {
		throw new Error('client not found')
	}
	return client
})

export const userLoader = loader$<{ DATABASE: D1Database; domain: string }, Promise<{ email: string }>>(
	async ({ cookie }) => {
		const jwt = cookie.get('CF_Authorization')
		if (jwt === null) {
			throw new Error('missing authorization')
		}
		try {
			// TODO: eventually, verify the JWT with Access, however this
			// is not critical.
			const payload = access.getPayload(jwt.value)
			return { email: payload.email }
		} catch (err: unknown) {
			console.warn(err.stack)
			throw new Error('failed to validate Access JWT')
		}
	}
)

export default component$(() => {
	const client = clientLoader.use().value
	const user = userLoader.use().value
	return (
		<div class="flex flex-col p-5 items-center">
			<h1 class="text-center mt-7 mb-9 flex items-center">
				<WildebeestLogo size="large" />
			</h1>
			<div class="text-left">
				<p>Signed in as: {user.email}.</p>
				<p>
					<a href="/cdn-cgi/access/logout">Click here to change account</a>.
				</p>
			</div>
			<p class="text-left">
				<b>{client.name}</b> would like permission to access your account. It is a third-party application. If you do
				not trust it, then you should not authorize it.
			</p>
			<form method="post" class="flex flex-col w-full max-w-md">
				<button
					type="submit"
					class="mb-9 bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-3 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
				>
					Authorize
				</button>
			</form>
		</div>
	)
})

export const head: DocumentHead = () => {
	return {
		title: 'Wildebeest Authorization required',
		meta: [
			{
				name: 'description',
				content: 'Wildebeest Authorization required',
			},
		],
	}
}
