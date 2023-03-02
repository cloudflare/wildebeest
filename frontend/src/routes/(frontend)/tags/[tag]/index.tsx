import { $, component$ } from '@builder.io/qwik'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { getDomain } from 'wildebeest/backend/src/utils/getDomain'
import { handleRequest } from 'wildebeest/functions/api/v1/timelines/tag/[tag]'
import { StatusesPanel } from '~/components/StatusesPanel/StatusesPanel'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { MastodonStatus } from '~/types'
import { getDocumentHead } from '~/utils/getDocumentHead'

export const loader = loader$<Promise<{ tag: string; statuses: MastodonStatus[] }>>(
	async ({ request, platform, params }) => {
		const tag = params.tag
		const response = await handleRequest(await getDatabase(platform), request, getDomain(request.url), tag)
		const results = await response.text()
		const statuses: MastodonStatus[] = JSON.parse(results)
		return { tag, statuses }
	}
)

export default component$(() => {
	const loaderData = loader()

	return (
		<>
			<div class="flex flex-col flex-1">
				<StickyHeader withBackButton backButtonPlacement="end">
					<h2 class="text-reg text-md m-0 p-4 flex bg-wildebeest-700">
						<i class="fa fa-hashtag fa-fw mr-3 w-5 leading-tight inline-block" />
						<span>{loaderData.value.tag}</span>
					</h2>
				</StickyHeader>
				<StatusesPanel
					initialStatuses={loaderData.value.statuses}
					fetchMoreStatuses={$(async (numOfCurrentStatuses: number) => {
						let statuses: MastodonStatus[] = []
						try {
							const response = await fetch(
								`/api/v1/timelines/tags/${loaderData.value.tag}/?offset=${numOfCurrentStatuses}`
							)
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
			</div>
		</>
	)
})

export const requestUrlLoader = loader$(async ({ request }) => request.url)

export const head: DocumentHead = ({ resolveValue }) => {
	const { tag } = resolveValue(loader)
	const url = resolveValue(requestUrlLoader)

	return getDocumentHead({
		title: `#${tag} - Wildebeest`,
		description: `#${tag} tag page - Wildebeest`,
		og: {
			url,
		},
	})
}
