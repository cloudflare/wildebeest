import { $, component$, useStore, useClientEffect$, useSignal } from '@builder.io/qwik'
import { DocumentHead } from '@builder.io/qwik-city'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { useDomain } from '~/utils/useDomain'
import Step1 from './step-1'
import { type InstanceConfig, testInstance } from './utils'

export default component$(() => {
	const domain = useDomain()

	const loading = useSignal(true)
	const instanceConfigured = useSignal(false)

	const instanceConfig = useStore<InstanceConfig>({
		title: `${domain} Wildebeest`,
		email: `admin@${domain}`,
		description: 'My personal Wildebeest instance (powered by Cloudflare)',
	})

	useClientEffect$(async () => {
		if (await testInstance()) {
			instanceConfigured.value = true
		}
		loading.value = false
	})

	const getStepToShow = () => {
		if (loading.value) return 'loading'
		if (!instanceConfigured.value) return 'step-1'
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
		<div class="flex flex-col p-5 items-center max-w-lg mx-auto">
			<h1 class="text-center mt-7 mb-9 flex items-center">
				<WildebeestLogo size="large" />
			</h1>
			{stepToShow.startsWith('step-') && (
				<div class="text-center">
					<p class="mb-1">Welcome to Wildebeest...</p>
					<p class="mb-5"> Your instance hasn't been configured yet.</p>
				</div>
			)}
			{stepToShow === 'loading' && <p>Loading...</p>}
			{stepToShow === 'step-1' && (
				<Step1 instanceConfig={instanceConfig} setLoading={setLoading} setInstanceConfigured={setInstanceConfigured} />
			)}
			{stepToShow === 'all-good' && <p class="text-center">All good, your instance is ready.</p>}
		</div>
	)
})

export const head: DocumentHead = () => {
	return {
		title: 'Wildebeest Start Instance',
		meta: [
			{
				name: 'description',
				content: 'Wildebeest Instance Setup page',
			},
		],
	}
}
