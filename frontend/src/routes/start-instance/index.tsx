import { component$, useStore, useTask$, useClientEffect$ } from '@builder.io/qwik'
import { isBrowser } from '@builder.io/qwik/build'
import { DocumentHead, useLocation, useNavigate } from '@builder.io/qwik-city'
import { MastodonLogo } from '~/components/MastodonLogo'
import { generateLoginURL } from 'wildebeest/backend/src/access'

export async function configure(data: unknown) {
	const res = await fetch('/start-instance', {
		method: 'POST',
		body: JSON.stringify(data),
	})
	if (!res.ok) {
		throw new Error('/start-instance returned: ' + res.status)
	}
}

export async function testAccess(): Promise<boolean> {
	const res = await fetch('/start-instance-test-access')
	return res.ok
}

export async function testInstance(): Promise<boolean> {
	const res = await fetch('/api/v1/instance')
	const data = await res.json<any>()
	return !!data.title
}

export const useDomain = () => {
	const location = useLocation()
	const url = new URL(location.href)
	const domain = url.hostname
	return domain
}

export default component$(() => {
	const domain = useDomain()
	const nav = useNavigate()
	const location = useLocation()

	const state = useStore({
		loading: true,
		accessConfigured: false,
		instanceConfigured: false,

		title: `${domain} Wildebeest`,
		email: `admin@${domain}`,
		description: 'My personal Wildebeest instance (powered by Cloudflare)',

		accessDomain: '',
		accessAud: '',
	})

	useClientEffect$(async () => {
		if (await testAccess()) {
			state.accessConfigured = true

			if (await testInstance()) {
				state.instanceConfigured = true
			}
		}
		state.loading = false
	})

	// if (state.loading) {
	// 	return <p>Loading...</p>
	// }

	return (
		<>
			{!state.accessConfigured ? (
				<div class="flex flex-column p-5 items-center">
					<h1 class="text-center mt-7 mb-9">
						<MastodonLogo size="medium" />
					</h1>

					<p class="max-w-md">Welcome to Wildebeest... Your instance hasn't been configured yet.</p>

					<h2>Step 1. Configure Cloudflare Pages for user management</h2>

					<p class="max-w-md">
						Wildebeest uses{' '}
						<a href="https://www.cloudflare.com/products/zero-trust/access/" target="_new">
							{' '}
							Cloudflare Access
						</a>{' '}
						for user management. You can configure Cloudflare Access to allow users to access Wildebeest.
					</p>

					<p class="max-w-md">
						Go to{' '}
						<a href="https://one.dash.cloudflare.com/" target="_new">
							Cloudflare Zero Trust dashboard
						</a>
						, select the account and go in Access {'>'} Applications.
					</p>

					<p>
						<img
							src="https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/f8ee9ab3-31d5-4204-94bd-25d00a971600/public"
							style={{ width: '100%' }}
						/>
					</p>

					<p class="max-w-md">
						An application called <code>wildebeest-username</code> should already be present.
					</p>

					<p class="max-w-md">Click on edit and in Overview copy the field called Application Audience (AUD) Tag.</p>

					<p>
						<img
							src="https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/54b11336-9c64-419b-5a5f-e80d5b833700/public"
							style={{ width: '100%' }}
						/>
					</p>

					<p class="max-w-md">Paste it bellow.</p>

					<form class="flex flex-column w-full max-w-md">
						<div class="flex flex-column mb-6">
							<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-access-aud">
								Access AUD
							</label>
							<div class="flex justify-center items-center flex-wrap gap-1">
								<input
									id="start-instance-access-aud"
									name="access-aud"
									type="access-aud"
									class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
									value={state.accessAud}
									onInput$={(ev) => (state.accessAud = (ev.target as HTMLInputElement).value)}
								/>
							</div>
						</div>
					</form>

					<p class="max-w-md">Then go to Settings {'>'} General.</p>

					<p>
						<img
							src="https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/51988fa3-44cc-4ec2-fb9a-2096d2f1c700/public"
							style={{ width: '100%' }}
						/>
					</p>

					<p class="max-w-md">Copy the Team domain and paste it bellow.</p>

					<div class="flex flex-column w-full max-w-md">
						<div class="flex flex-column mb-6">
							<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-access-domain">
								Access domain
							</label>
							<div class="flex justify-center items-center flex-wrap gap-1">
								<input
									id="start-instance-access-domain"
									name="access-domain"
									type="access-domain"
									class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
									value={state.accessDomain}
									onInput$={(ev) => (state.accessDomain = (ev.target as HTMLInputElement).value)}
								/>
								<span>.cloudflareaccess.com</span>
							</div>
						</div>

						<button
							class="mb-9 bg-indigo-600 hover:bg-indigo-500 p-3 text-white text-uppercase border-indigo-600 text-lg text-semi outline-none border rounded hover:border-indigo-500 focus:border-indigo-500"
							preventdefault:click
							onClick$={async () => {
								state.loading = true
								await configure({
									accessDomain: state.accessDomain,
									accessAud: state.accessAud,
								})
								state.loading = false

								const url = generateLoginURL({
									redirectURL: location.href,
									domain: 'https://' + state.accessDomain + '.cloudflareaccess.com',
									aud: state.accessAud,
								})
								window.location.href = url
							}}
						>
							Configure and test
						</button>
					</div>
				</div>
			) : (
				''
			)}

			{state.accessConfigured && !state.instanceConfigured ? (
				<div class="flex flex-column p-5 items-center">
					<h1 class="text-center mt-7 mb-9">
						<MastodonLogo size="medium" />
					</h1>
					<p class="max-w-md">Welcome to Wildebeest... Your instance hasn't been configured yet.</p>

					<h2>Step 2. Configure instance</h2>

					<form class="flex flex-column w-full max-w-md">
						<div class="flex flex-column mb-6">
							<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-title">
								Title
							</label>
							<div class="flex justify-center items-center flex-wrap gap-1">
								<input
									id="start-instance-title"
									name="title"
									class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
									value={state.title}
									onInput$={(ev) => (state.title = (ev.target as HTMLInputElement).value)}
								/>
							</div>
						</div>

						<div class="flex flex-column mb-6">
							<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-email">
								Administrator email
							</label>
							<div class="flex justify-center items-center flex-wrap gap-1">
								<input
									id="start-instance-email"
									name="email"
									type="email"
									class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
									value={state.email}
									onInput$={(ev) => (state.email = (ev.target as HTMLInputElement).value)}
								/>
							</div>
						</div>

						<div class="flex flex-column mb-6">
							<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-description">
								Description
							</label>
							<div class="flex justify-center items-center flex-wrap gap-1">
								<input
									id="start-instance-description"
									name="description"
									class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
									value={state.description}
									onInput$={(ev) => (state.description = (ev.target as HTMLInputElement).value)}
								/>
							</div>
						</div>

						<button
							type="submit"
							class="mb-9 bg-indigo-600 hover:bg-indigo-500 p-3 text-white text-uppercase border-indigo-600 text-lg text-semi outline-none border rounded hover:border-indigo-500 focus:border-indigo-500"
							preventdefault:click
							onClick$={async () => {
								state.loading = true
								await configure(state)

								if (await testInstance()) {
									state.instanceConfigured = true
								}

								state.loading = false
							}}
						>
							Configure and start your instance
						</button>
					</form>
				</div>
			) : (
				''
			)}

			{state.accessConfigured && state.instanceConfigured ? <p>All good, your instance is ready.</p> : ''}
		</>
	)
})

export const head: DocumentHead = {
	title: 'Wildebeest (Mastodon on Cloudflare)',
	meta: [
		{
			name: 'description',
			content: 'A frontend for a mastodon server deployed on Cloudflare.',
		},
	],
}
