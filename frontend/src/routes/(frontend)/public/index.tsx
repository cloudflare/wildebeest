import { $, component$ } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { RequestContext } from '@builder.io/qwik-city/middleware/request-handler'
import { StatusesPanel } from '~/components/StatusesPanel/StatusesPanel'

export const statusesLoader = loader$<{ DATABASE: D1Database; domain: string }, Promise<MastodonStatus[]>>(
	async ({ platform, html }) => {
		try {
			// TODO: use the "trending" API endpoint here.
			const response = await timelines.handleRequest(platform.domain, platform.DATABASE)
			const results = await response.text()
			// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
			return JSON.parse(results) as MastodonStatus[]
		} catch {
			throw html(500, 'The public timeline is unavailable')
		}
	}
)

export default component$(() => {
	const statuses = statusesLoader.use().value

	return (
		<>
			<StickyHeader>
				<div class="xl:rounded-t bg-wildebeest-700 p-4 flex items-center text-white">
					<i style={{ width: '1.25rem', height: '1rem' }} class="fa fa-globe fa-fw mr-3 w-5 h-4" />
					<span>Federated timeline</span>
				</div>
			</StickyHeader>
			<StatusesPanel
				initialStatuses={statuses}
				fetchMoreStatuses={$(async (numOfCurrentStatuses: number) => {
					let statuses: MastodonStatus[] = []
					try {
						const response = await fetch(`/api/v1/timelines/public?offset=${numOfCurrentStatuses}`)
						if (response.ok) {
							const results = await response.text()
							statuses = JSON.parse(results)
						}
					} catch {
						/* empty */
					}
					return statuses
				})}
			/>
		</>
	)
})

export const requestLoader = loader$(async ({ request }) => {
	// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
	return JSON.parse(JSON.stringify(request)) as RequestContext
})

export const head: DocumentHead = ({ getData }) => {
	const { url } = getData(requestLoader)
	return getDocumentHead({
		title: 'Federated timeline - Wildebeest',
		og: {
			url,
		},
	})
}
