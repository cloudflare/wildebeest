import { component$, Slot, useContextProvider } from '@builder.io/qwik'
import { DocumentHead, useLocation, loader$ } from '@builder.io/qwik-city'
import * as instance from 'wildebeest/functions/api/v1/instance'
import type { InstanceConfig } from 'wildebeest/backend/src/types/configs'
import LeftColumn from '../components/layout/LeftColumn/LeftColumn'
import RightColumn from '../components/layout/RightColumn/RightColumn'
import { InstanceConfigContext } from '~/utils/instanceConfig'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { getCommitHash } from '~/utils/getCommitHash'

const pathsWithoutColumns = ['/first-login', '/start-instance']

export const useShowHeaderAndColumns = () => {
	const location = useLocation()
	const pathname = new URL(location.href).pathname
	return !pathsWithoutColumns.includes(pathname)
}

export const instanceLoader = loader$<{ DATABASE: D1Database; domain: string }, Promise<InstanceConfig>>(
	async ({ platform }) => {
		const response = await instance.handleRequest('', platform.DATABASE)
		const results = await response.text()
		const json = JSON.parse(results) as InstanceConfig
		return json
	}
)

export default component$(() => {
	const showHeaderAndColumns = useShowHeaderAndColumns()

	useContextProvider(InstanceConfigContext, instanceLoader.use().value)

	return (
		<>
			{showHeaderAndColumns && (
				<header class="h-[3.9rem] z-50 sticky top-0 bg-wildebeest-600 p-3 w-full border-b border-wildebeest-700 xl:hidden">
					<a class="no-underline flex items-center w-max" href="https://mastodon.social">
						<WildebeestLogo size="small" />
					</a>
				</header>
			)}
			<main class="h-full flex justify-center main-wrapper top-[3.9rem]">
				{showHeaderAndColumns && (
					<div class="w-fit md:w-72 hidden xl:block mx-[10px]">
						<div class="sticky top-[10px]">
							<LeftColumn />
						</div>
					</div>
				)}
				<div class={`w-full ${showHeaderAndColumns ? 'xl:max-w-xl' : ''}`}>
					<div class={`bg-wildebeest-600 ${showHeaderAndColumns ? 'rounded ' : 'min-h-screen'}`}>
						<Slot />
					</div>
				</div>
				{showHeaderAndColumns && (
					<div class="w-fit md:w-72 border-l xl:border-l-0 border-wildebeest-700 xl:mx-[10px] flex flex-col">
						<div class="xl:top-[10px] flex-1 flex flex-col">
							<RightColumn />
						</div>
					</div>
				)}
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
