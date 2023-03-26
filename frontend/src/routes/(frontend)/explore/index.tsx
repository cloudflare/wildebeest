import { $, component$ } from '@builder.io/qwik'
import { getDatabase } from 'wildebeest/backend/src/database'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import { StatusesPanel } from '~/components/StatusesPanel/StatusesPanel'
import type { MastodonStatus } from '~/types'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'

export const statusesLoader = loader$<Promise<MastodonStatus[]>>(async ({ platform, html }) => {
	try {
		// TODO: use the "trending" API endpoint here.
		const response = await timelines.handleRequest(platform.domain, await getDatabase(platform))
		const results = await response.text()
		// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
		return JSON.parse(results) as MastodonStatus[]
	} catch (e: unknown) {
		const error = e as { stack: string; cause: string }
		console.error(error.stack, error.cause)
		throw html(500, getErrorHtml('The timeline is unavailable, please try again later'))
	}
})

export default component$(() => {
	const statuses = statusesLoader().value
	return (
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
	)
})

export const requestUrlLoader = loader$(async ({ request }) => request.url)

export const head: DocumentHead = ({ resolveValue }) => {
	const url = resolveValue(requestUrlLoader)
	return getDocumentHead({
		title: 'Explore - Wildebeest',
		og: {
			url,
		},
	})
}
