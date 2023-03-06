import { component$ } from '@builder.io/qwik'
import type { Client } from 'wildebeest/backend/src/mastodon/client'
import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { Avatar } from '~/components/avatar'
import { getPersonByEmail } from 'wildebeest/backend/src/activitypub/actors'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import { buildRedirect } from 'wildebeest/functions/oauth/authorize'
import { getDatabase } from 'wildebeest/backend/src/database'
import { getJwtEmail } from 'wildebeest/backend/src/utils/auth/getJwtEmail'

export const clientLoader = loader$<Promise<Client>>(async ({ platform, query, html }) => {
	const client_id = query.get('client_id') || ''
	let client: Client | null = null
	try {
		client = await getClientById(await getDatabase(platform), client_id)
	} catch (e: unknown) {
		const error = e as { stack: string; cause: string }
		console.warn(error.stack, error.cause)
		throw html(500, getErrorHtml('An error occurred while trying to fetch the client data, please try again later'))
	}
	if (client === null) {
		throw html(500, getErrorHtml('client not found'))
	}
	return client
})

export const userLoader = loader$<Promise<{ email: string; avatar: URL; name: string; url: URL }>>(
	async ({ cookie, platform, html, request, redirect, text }) => {
		const jwt = cookie.get('CF_Authorization')
		let email = ''
		try {
			email = getJwtEmail(jwt?.value ?? '')
		} catch (e) {
			throw html(500, getErrorHtml((e as Error)?.message))
		}

		const person = await getPersonByEmail(await getDatabase(platform), email)
		if (person === null) {
			const isFirstLogin = true
			/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				-- jwt is defined otherwise getJwtEmail would have thrown
			*/
			const res = await buildRedirect(await getDatabase(platform), request as Request, isFirstLogin, jwt!.value)
			if (res.status === 302) {
				throw redirect(302, res.headers.get('location') || '')
			} else {
				throw text(res.status, await res.text())
			}
		}

		const name = person.name
		const avatar = person.icon?.url
		const url = person.url

		if (!name || !avatar) {
			throw html(500, getErrorHtml("The person associated with the Access JWT doesn't include a name or avatar"))
		}

		return { email, avatar, name, url }
	}
)

export default component$(() => {
	const client = clientLoader().value
	const { email, avatar, name: display_name, url } = userLoader().value
	return (
		<div class="flex flex-col p-4 items-center">
			<h1 class="text-center mt-3 mb-5 flex items-center">
				<WildebeestLogo size="medium" />
			</h1>
			<hr class="border-t-0 border-b border-wildebeest-700 w-full mb-10" />
			<div class="max-w-lg text-left">
				<div class="border-b border-wildebeest-700 pb-10 mx-auto mt-5 mb-[5rem] flex flex-wrap justify-between gap-4 items-center">
					<div class="grid grid-rows-[repeat(2,_1fr)] grid-cols-[max-content,_1fr] items-center">
						<div class="row-span-2 mr-4">
							<Avatar
								primary={{
									avatar: avatar.toString(),
									display_name,
									url: url.toString(),
								}}
								secondary={null}
								withLinks={true}
							/>
						</div>
						<p class="col-start-2">Signed in as:</p>
						<p class="col-start-2 font-bold">{email}</p>
					</div>
					<a
						class="no-underline col-start-3 row-span-full ml-auto"
						href="/cdn-cgi/access/logout"
						aria-label="Change Account"
					>
						<div class="text-wildebeest-500 opacity-40 hover:opacity-70 focus:opacity-70 flex items-baseline">
							<i class="fa fa-right-from-bracket text-[2.2rem]" />
						</div>
					</a>
				</div>
				<h2 class="text text-xl font-semibold mb-5">Authorization required</h2>
				<p class="mb-10">
					<strong class="text-[1rem]">{client.name}</strong>
					<span class="text-wildebeest-400">
						{' '}
						would like permission to access your account. It is a third-party application.
					</span>
					<strong class="text-[1rem]"> If you do not trust it, then you should not authorize it.</strong>
				</p>
				<h2 class="text text-xl font-semibold mb-5">Review permissions</h2>
				<div class="mb-5 grid grid-rows-[repeat(2,_1fr)] grid-cols-[max-content,_1fr] items-center bg-wildebeest-800 border border-wildebeest-600 p-4 rounded-md">
					<i class="fa-solid fa-check col-span-1 row-span-full text-[1.3rem] ml-2 mr-5 text-green-500 w-[1.5rem]"></i>
					<strong class="col-start-2">Everything</strong>
					<span class="col-start-2">Read and write access</span>
				</div>
				<form method="post" class="flex flex-col w-full">
					<button
						type="submit"
						class="mx-auto px-9 my-9 uppercase font-semibold bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-3 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
					>
						Authorize
					</button>
				</form>
			</div>
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
