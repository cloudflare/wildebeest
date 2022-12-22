import { component$, Resource, useResource$ } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import { statuses } from '~/dummyData'
import Status from '~/components/Status'

export default component$(() => {
	const resource = useResource$<MastodonStatus[]>(async () => {
		return statuses
	})

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
