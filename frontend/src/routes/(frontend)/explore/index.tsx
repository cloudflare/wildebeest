import { $, component$, useClientEffect$, useSignal } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import Status from '~/components/Status'
import type { MastodonStatus } from '~/types'
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
	return <StatusesPanel initialStatuses={statuses.value} />
})

type StatusesPanelProps = { initialStatuses: MastodonStatus[] }

export const StatusesPanel = component$(({ initialStatuses }: StatusesPanelProps) => {
	const fetchingMoreStatuses = useSignal(false)
	const noMoreStatusesAvailable = useSignal(false)
	const lastStatusRef = useSignal<HTMLDivElement>()
	const statuses = useSignal<MastodonStatus[]>(initialStatuses)

	const fetchMoreStatuses = $(async () => {
		if (fetchingMoreStatuses.value || noMoreStatusesAvailable.value) {
			return
		}
		fetchingMoreStatuses.value = true
		const response = await fetch(`/api/v1/timelines/public?offset=${statuses.value.length}`)
		fetchingMoreStatuses.value = false
		if (response.ok) {
			const results = await response.text()
			const newStatuses: MastodonStatus[] = JSON.parse(results)
			noMoreStatusesAvailable.value = newStatuses.length === 0
			statuses.value = statuses.value.concat(newStatuses)
		}
		fetchingMoreStatuses.value = false
	})

	useClientEffect$(({ track }) => {
		track(() => lastStatusRef.value)
		if (lastStatusRef.value) {
			const observer = new IntersectionObserver(
				async ([lastStatus]) => {
					if (lastStatus.isIntersecting) {
						await fetchMoreStatuses()
						observer.disconnect()
					}
				},
				{ rootMargin: '250px' }
			)
			observer.observe(lastStatusRef.value)
		}
	})

	return (
		<>
			{statuses.value.length > 0 ? (
				statuses.value.map((status, i) => {
					const isLastStatus = i === statuses.value.length - 1
					const divProps = isLastStatus ? { ref: lastStatusRef } : {}
					return (
						<div key={status.id} {...divProps}>
							<Status status={status} />
						</div>
					)
				})
			) : (
				<div class="flex-1 grid place-items-center bg-wildebeest-600 text-center">
					<p>Nothing to see right now. Check back later!</p>
				</div>
			)}
		</>
	)
})
