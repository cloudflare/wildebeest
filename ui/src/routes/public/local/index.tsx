import { component$, Resource, useResource$ } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import { statuses } from '~/dummyData'
import Status from '~/components/Status'

export default component$(() => {
	const resource = useResource$<MastodonStatus[]>(async () => {
		// simulate some dummy posts being local
		return statuses.reduce<MastodonStatus[]>((acc, val, i) => (i % 2 === 0 ? [...acc, val] : acc), [])
	})

	return (
		<Resource
			value={resource}
			onPending={() => <div>loading...</div>}
			onRejected={() => <div>failed</div>}
			onResolved={(statuses) => {
				return (
					<>
						<div class="rounded-t bg-slate-700 p4 flex items-center">
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
