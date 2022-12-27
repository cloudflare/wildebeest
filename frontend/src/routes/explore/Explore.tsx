import { component$, Resource } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import * as timelines from 'wildebeest/functions/api/v1/timelines/public'
import Status from '~/components/Status'
import { RequestHandler, useEndpoint } from '@builder.io/qwik-city'

export const onGet: RequestHandler<MastodonStatus[], { DATABASE: any, domain: string }> = async ({ platform }) => {
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
			onResolved={(statuses) => {
				return (
					<>
						{statuses.map((status) => (
							<Status key={status.id} status={status} />
						))}
					</>
				)
			}}
		/>
	)
})
