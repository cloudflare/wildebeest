import { $, component$ } from '@builder.io/qwik'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { RequestContext } from '@builder.io/qwik-city/middleware/request-handler'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import { StatusesPanel } from '~/components/StatusesPanel/StatusesPanel'
import type { MastodonStatus } from '~/types'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'

export const statusesLoader = loader$<{ DATABASE: D1Database; domain: string }, Promise<MastodonStatus[]>>(
	async ({ platform, html }) => {
		try {
			// TODO: use the "trending" API endpoint here.
			const response = await timelines.handleRequest(platform.domain, platform.DATABASE)
			const results = await response.text()
			// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
			return JSON.parse(results) as MastodonStatus[]
		} catch (e: unknown) {
			const error = e as { stack: string; cause: string }
			console.warn(error.stack, error.cause)
			throw html(500, getErrorHtml('The timeline is unavailable, please try again later'))
		}
	}
)

export default component$(() => {
	const statuses = statusesLoader.use()
	return (
		<StatusesPanel
			initialStatuses={statuses.value}
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

export const requestLoader = loader$(async ({ request }) => {
	// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
	return JSON.parse(JSON.stringify(request)) as RequestContext
})

export const head: DocumentHead = ({ getData }) => {
	const { url } = getData(requestLoader)
	return getDocumentHead({
		title: 'Explore - Wildebeest',
		og: {
			url,
		},
	})
}
