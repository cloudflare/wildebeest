import { component$ } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import Status from '~/components/Status'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { RequestContext } from '@builder.io/qwik-city/middleware/request-handler'

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
	const statuses = statusesLoader.use()

	return (
		<>
			<StickyHeader>
				<div class="xl:rounded-t bg-wildebeest-700 p-4 flex items-center text-white">
					<i style={{ width: '1.25rem', height: '1rem' }} class="fa fa-globe fa-fw mr-3 w-5 h-4" />
					<span>Federated timeline</span>
				</div>
			</StickyHeader>
			{statuses.value.length > 0 ? (
				statuses.value.map((status) => <Status status={status} />)
			) : (
				<div class="flex-1 grid place-items-center bg-wildebeest-600 text-center">
					<p>Nothing to see right now. Check back later!</p>
				</div>
			)}
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
