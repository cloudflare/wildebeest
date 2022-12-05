import { $, component$, useStore, useClientEffect$, useSignal } from '@builder.io/qwik'
import { DocumentHead } from '@builder.io/qwik-city'
import { MastodonLogo } from '~/components/MastodonLogo'
import { useDomain } from '~/utils/useDomain'
import Step1 from './step-1'
import Step2 from './step-2'
import { type InstanceConfig, testAccess, testInstance } from './utils'

export default component$(() => {
	const domain = useDomain()

	const loading = useSignal(true)
	const accessConfigured = useSignal(false)
	const instanceConfigured = useSignal(false)

	const instanceConfig = useStore<InstanceConfig>({
		title: `${domain} Wildebeest`,
		email: `admin@${domain}`,
		description: 'My personal Wildebeest instance (powered by Cloudflare)',
		accessDomain: '',
		accessAud: '',
	})

	useClientEffect$(async () => {
		if (await testAccess()) {
			accessConfigured.value = true

			if (await testInstance()) {
				instanceConfigured.value = true
			}
		}
		loading.value = false
	})

	const getStepToShow = () => {
		if (loading.value) return 'loading'
		if (!accessConfigured.value) return 'step-1'
		if (!instanceConfigured.value) return 'step-2'
		return 'all-good'
	}

	const stepToShow = getStepToShow()

	const setLoading = $((value: boolean) => {
		loading.value = value
	})

	const setInstanceConfigured = $((value: boolean) => {
		instanceConfigured.value = value
	})

	return (
		<div class="flex flex-column p-5 items-center max-w-lg mx-auto">
			<h1 class="text-center mt-7 mb-9">
				<MastodonLogo size="medium" />
			</h1>
			{stepToShow.startsWith('step-') && <p>Welcome to Wildebeest... Your instance hasn't been configured yet.</p>}
			{stepToShow === 'loading' && <p>Loading...</p>}
			{stepToShow === 'step-1' && <Step1 instanceConfig={instanceConfig} setLoading={setLoading} />}
			{stepToShow === 'step-2' && (
				<Step2 instanceConfig={instanceConfig} setLoading={setLoading} setInstanceConfigured={setInstanceConfigured} />
			)}
			{stepToShow === 'all-good' && <p>All good, your instance is ready.</p>}
		</div>
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
