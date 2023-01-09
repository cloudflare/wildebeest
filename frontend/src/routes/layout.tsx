import { component$, Slot, useContextProvider } from '@builder.io/qwik'
import { DocumentHead, useLocation, loader$ } from '@builder.io/qwik-city'
import * as instance from 'wildebeest/functions/api/v1/instance'
import type { InstanceConfig } from 'wildebeest/backend/src/types/configs'
import LeftColumn from '../components/layout/LeftColumn/LeftColumn'
import RightColumn from '../components/layout/RightColumn/RightColumn'
import { InstanceConfigContext } from '~/utils/instanceConfig'
import { WildebeestLogo } from '~/components/MastodonLogo'

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
				<header class="h-[4.5rem] z-50 sticky top-0 bg-slate-800 p-3 w-full border-b border-slate-700 xl:hidden">
					<a class="no-underline flex items-center w-max" href="https://mastodon.social">
						<WildebeestLogo size="small" />
						{/* TODO: We need to move the text inside the logo component for better reusability
						(because we are adding the text every time we use the logo anyways) */}
						<span class="text-white font-bold text-xl ml-[-27px] mt-[-27px]">ildebeest</span>
					</a>
				</header>
			)}
			<main class="h-full flex justify-center main-wrapper sticky top-[4.5rem]">
				{showHeaderAndColumns && (
					<div class="w-fit md:w-72 hidden xl:block mx-[10px]">
						<div class="sticky top-[10px]">
							<LeftColumn />
						</div>
					</div>
				)}
				<div class={`w-full ${showHeaderAndColumns ? 'xl:max-w-xl' : ''}`}>
					<div class={`bg-slate-800 ${showHeaderAndColumns ? 'rounded ' : 'min-h-screen'}`}>
						<Slot />
					</div>
				</div>
				{showHeaderAndColumns && (
					<div class="w-fit md:w-72 border-l xl:border-l-0 border-slate-700 xl:mx-[10px]">
						<div class="sticky top-[4.5rem] xl:top-[10px]">
							<RightColumn />
						</div>
					</div>
				)}
			</main>
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
