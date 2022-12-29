import { component$, Resource } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import Status from '~/components/Status'
import { RequestHandler, useEndpoint } from '@builder.io/qwik-city'

export const onGet: RequestHandler<MastodonStatus[], { DATABASE: any; domain: string }> = async ({ platform }) => {
	const response = await timelines.handleRequest(platform.domain, platform.DATABASE, { local: true })
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
			onResolved={(statuses) => {
				return (
					<>
						<div class="rounded-t bg-slate-700 p-4 flex items-center">
							<i class="fa fa-users fa-fw mr-3 text-slate-100" />
							<span>Local timeline</span>
						</div>
						{statuses.map((status) => (
							<Status status={status} />
						))}
					</>
				)
			}}
		/>
	)
})
