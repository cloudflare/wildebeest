import { component$, QRL } from '@builder.io/qwik'
import { generateLoginURL } from 'wildebeest/backend/src/access'
import { configure, type InstanceConfig } from './utils'

interface Props {
	instanceConfig: InstanceConfig
	setLoading: QRL<(loading: boolean) => void>
}

export default component$<Props>(({ instanceConfig, setLoading }) => {
	return (
		<>
			<h2>Step 1. Configure Cloudflare Pages for user management</h2>

			<p>
				Wildebeest uses{' '}
				<a href="https://www.cloudflare.com/products/zero-trust/access/" target="_new">
					{' '}
					Cloudflare Access
				</a>{' '}
				for user management. You can configure Cloudflare Access to allow users to access Wildebeest.
			</p>

			<p>
				Go to{' '}
				<a href="https://one.dash.cloudflare.com/" target="_new">
					Cloudflare Zero Trust dashboard
				</a>
				, select the account and go in Access {'>'} Applications.
			</p>

			<ViewableImage
				src="https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/f8ee9ab3-31d5-4204-94bd-25d00a971600/public"
				ariaLabel="Cloudflare Zero Trust Dashboard Applications Screenshot"
			/>

			<p>
				An application called <code>wildebeest-username</code> should already be present.
			</p>

			<p>Click on edit and in Overview copy the field called Application Audience (AUD) Tag.</p>

			<ViewableImage
				src="https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/54b11336-9c64-419b-5a5f-e80d5b833700/public"
				ariaLabel="Cloudflare Zero Trust Dashboard Application Overview Screenshot"
			/>

			<p>Paste it bellow.</p>

			<div class="flex flex-column mb-6 w-full max-w-md">
				<label class="mb-2 text-semi text-sm" for="start-instance-access-aud">
					Access AUD
				</label>
				<div class="flex justify-center items-center flex-wrap gap-1">
					<input
						id="start-instance-access-aud"
						name="access-aud"
						type="access-aud"
						class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
						value={instanceConfig.accessAud}
						onInput$={(ev) => (instanceConfig.accessAud = (ev.target as HTMLInputElement).value)}
					/>
				</div>
			</div>

			<p>Then go to Settings {'>'} General.</p>

			<ViewableImage
				src="https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/51988fa3-44cc-4ec2-fb9a-2096d2f1c700/public"
				ariaLabel="Cloudflare Zero Trust Dashboard General Settings Screenshot"
			/>

			<p>Copy the Team domain and paste it bellow.</p>

			<div class="flex flex-column w-full max-w-md">
				<div class="flex flex-column mb-6">
					<label class="mb-2 text-semi text-sm" for="start-instance-access-domain">
						Access domain
					</label>
					<div class="flex justify-center items-center flex-wrap gap-1">
						<input
							id="start-instance-access-domain"
							name="access-domain"
							type="access-domain"
							class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
							value={instanceConfig.accessDomain}
							onInput$={(ev) => (instanceConfig.accessDomain = (ev.target as HTMLInputElement).value)}
						/>
						<span>.cloudflareaccess.com</span>
					</div>
				</div>

				<button
					class="mb-9 bg-indigo-600 hover:bg-indigo-500 p-3 text-white text-uppercase border-indigo-600 text-lg text-semi outline-none border rounded hover:border-indigo-500 focus:border-indigo-500 max-w-md"
					preventdefault:click
					onClick$={async () => {
						setLoading(true)
						await configure({
							accessDomain: instanceConfig.accessDomain,
							accessAud: instanceConfig.accessAud,
						})
						setLoading(false)

						const url = generateLoginURL({
							redirectURL: location.href,
							domain: 'https://' + instanceConfig.accessDomain + '.cloudflareaccess.com',
							aud: instanceConfig.accessAud,
						})
						window.location.href = url
					}}
				>
					Configure and test
				</button>
			</div>
		</>
	)
})

export const ViewableImage = component$(({ src, ariaLabel }: { src: string; ariaLabel: string }) => {
	return (
		<a href={src} target="_blank">
			<img src={src} class="w-full" aria-label={ariaLabel} />
		</a>
	)
})
