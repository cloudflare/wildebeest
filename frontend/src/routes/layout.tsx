import { component$, useStylesScoped$, Slot, useContextProvider } from '@builder.io/qwik'
import { DocumentHead, useLocation, loader$ } from '@builder.io/qwik-city'
import * as instance from 'wildebeest/functions/api/v1/instance'
import type { InstanceConfig } from 'wildebeest/backend/src/types/configs'
import LeftColumn from '../components/layout/LeftColumn/LeftColumn'
import RightColumn from '../components/layout/RightColumn/RightColumn'
import styles from './layout.scss?inline'
import { InstanceConfigContext } from '~/utils/instanceConfig'

const pathsWithoutColumns = ['/first-login', '/start-instance']

export const useShowColumns = () => {
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
	useStylesScoped$(styles)

	const showColumns = useShowColumns()

	useContextProvider(InstanceConfigContext, instanceLoader.use().value)

	return (
		<main class="main-wrapper">
			{showColumns && (
				<div class="side-column">
					<div class="sticky">
						<LeftColumn />
					</div>
				</div>
			)}
			<div class={`w-full ${showColumns ? 'max-w-lg' : ''}`}>
				<div class={`bg-slate-800 ${showColumns ? 'rounded ' : 'min-h-screen'}`}>
					<Slot />
				</div>
			</div>
			{showColumns && (
				<div class="side-column">
					<div class="sticky">
						<RightColumn />
					</div>
				</div>
			)}
		</main>
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
