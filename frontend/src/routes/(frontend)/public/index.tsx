import { $, component$ } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { StatusesPanel } from '~/components/StatusesPanel/StatusesPanel'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import { getDatabase } from 'wildebeest/backend/src/database'

export const statusesLoader = loader$<Promise<MastodonStatus[]>>(async ({ platform, html }) => {
	try {
		// TODO: use the "trending" API endpoint here.
		const response = await timelines.handleRequest(platform.domain, await getDatabase(platform))
		const results = await response.text()
		// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
		return JSON.parse(results) as MastodonStatus[]
	} catch (e: unknown) {
		const error = e as { stack: string; cause: string }
		console.warn(error.stack, error.cause)
		throw html(500, getErrorHtml('The public timeline is unavailable'))
	}
})

export default component$(() => {
	const statuses = statusesLoader().value

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

export const requestUrlLoader = loader$(async ({ request }) => request.url)

export const head: DocumentHead = ({ resolveValue }) => {
	const url = resolveValue(requestUrlLoader)
	return getDocumentHead({
		title: 'Federated timeline - Wildebeest',
		og: {
			url,
		},
	})
}
