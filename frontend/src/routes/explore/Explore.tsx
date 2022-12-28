import { $, component$, Resource, useClientEffect$, useSignal } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import Status from '~/components/Status'
import { RequestHandler, useEndpoint } from '@builder.io/qwik-city'

export const onGet: RequestHandler<MastodonStatus[], { DATABASE: any; domain: string }> = async ({ platform }) => {
	// TODO: use the "trending" API endpoint here.
	const response = await timelines.handleRequest(platform.domain, platform.DATABASE)
	const results = await response.text()
	// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
	return JSON.parse(results)
}

export default component$(() => {
	const resource = useEndpoint<MastodonStatus[]>()
	return (
		<Resource
			value={resource}
			onPending={() => <div>loading...</div>}
			onRejected={() => <div>failed</div>}
			onResolved={(statuses) => <StatusesPanel initialStatuses={statuses} />}
		/>
	)
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
			{statuses.value.map((status, i) => {
				const isLastStatus = i === statuses.value.length - 1
				const divProps = isLastStatus ? { ref: lastStatusRef } : {}
				return (
					<div key={status.id} {...divProps}>
						<Status status={status} />
					</div>
				)
			})}
		</>
	)
})
