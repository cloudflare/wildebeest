import { component$, Slot, useContextProvider } from '@builder.io/qwik'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import * as instance from 'wildebeest/functions/api/v1/instance'
import type { InstanceConfig } from 'wildebeest/backend/src/types/configs'
import LeftColumn from '~/components/layout/LeftColumn/LeftColumn'
import RightColumn from '~/components/layout/RightColumn/RightColumn'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { getCommitHash } from '~/utils/getCommitHash'
import { InstanceConfigContext } from '~/utils/instanceConfig'

export const instanceLoader = loader$<{ DATABASE: D1Database; domain: string }, Promise<InstanceConfig>>(
	async ({ platform }) => {
		const response = await instance.handleRequest('', platform.DATABASE)
		const results = await response.text()
		const json = JSON.parse(results) as InstanceConfig
		return json
	}
)

export default component$(() => {
	useContextProvider(InstanceConfigContext, instanceLoader.use().value)

	return (
		<>
			<header class="h-[3.9rem] z-50 sticky top-0 bg-wildebeest-600 p-3 w-full border-b border-wildebeest-700 xl:hidden">
				<a class="no-underline flex items-center w-max" href="https://mastodon.social">
					<WildebeestLogo size="small" />
				</a>
			</header>
			<main class="h-full flex justify-center main-wrapper top-[3.9rem]">
				<div class="w-fit md:w-72 hidden xl:block mx-[10px]">
					<div class="sticky top-[10px]">
						<LeftColumn />
					</div>
				</div>
				<div class="w-full xl:max-w-xl">
					<div class="bg-wildebeest-600 rounded">
						<Slot />
					</div>
				</div>
				<div class="w-fit md:w-72 border-l xl:border-l-0 border-wildebeest-700 xl:mx-[10px] flex flex-col">
					<div class="xl:top-[10px] flex-1 flex flex-col">
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
