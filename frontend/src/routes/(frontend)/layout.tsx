import { component$, Slot, useContextProvider } from '@builder.io/qwik'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import * as instance from 'wildebeest/functions/api/v1/instance'
import type { InstanceConfig } from 'wildebeest/backend/src/types/configs'
import LeftColumn from '~/components/layout/LeftColumn/LeftColumn'
import RightColumn from '~/components/layout/RightColumn/RightColumn'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { getCommitHash } from '~/utils/getCommitHash'
import { InstanceConfigContext } from '~/utils/instanceConfig'

export const instanceLoader = loader$<{ DATABASE: D1Database }, Promise<InstanceConfig>>(
	async ({ platform, redirect }) => {
		const response = await instance.handleRequest('', platform.DATABASE)
		const results = await response.text()
		const json = JSON.parse(results) as InstanceConfig
		if (!json.title) {
			// If there is no title set then we have not configured the instance
			throw redirect(302, '/start-instance')
		}
		return json
	}
)

export default component$(() => {
	useContextProvider(InstanceConfigContext, instanceLoader.use().value)

	return (
		<>
			<header class="h-[3.9rem] z-50 sticky top-0 bg-wildebeest-600 p-3 w-full border-b border-wildebeest-700 xl:hidden">
				<a class="no-underline flex items-center w-max" aria-label="Wildebeest Home" href="/">
					<WildebeestLogo size="small" />
				</a>
			</header>
			<main class="flex-1 flex justify-center main-wrapper top-[3.9rem]">
				<div class="w-fit md:w-72 hidden xl:block mx-2.5">
					<div class="sticky top-2.5">
						<LeftColumn />
					</div>
				</div>
				<div class="w-full xl:max-w-xl bg-wildebeest-600 xl:bg-transparent">
					<div class="bg-wildebeest-600 rounded">
						<Slot />
					</div>
				</div>
				<div class="w-fit md:w-72 border-l xl:border-l-0 border-wildebeest-700 xl:mx-2.5 flex flex-col">
					<div class="xl:top-2.5 flex-1 flex flex-col">
						<RightColumn />
					</div>
				</div>
			</main>
			<footer class="flex justify-end p-2 bg-wildebeest-600 border-t border-wildebeest-700 xl:bg-transparent xl:mt-10 xl:mx-6">
				<p class="text-sm text-wildebeest-500">v.{getCommitHash()}</p>
			</footer>
		</>
	)
})

export const head: DocumentHead = (props) => {
	const config = props.getData(instanceLoader)
	return {
		title: config.short_description,
		meta: [
			{
				name: 'description',
				content: config.description,
			},
		],
	}
}
