import { component$, Resource, useResource$, useStyles$ } from '@builder.io/qwik'
import { MastodonStatus } from '~/types'
import { statuses } from '~/dummyData'
import styles from './Explore.scss?inline'
import Status from '~/components/Status'

export default component$(() => {
	useStyles$(styles)
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
						<div class="header-wrapper">
							<h2 class="text-reg text-md m0 p4 bg-slate-700 rounded-t">
								<span class="text-bold mr-3">#</span>Explore
							</h2>
						</div>
						<div class="bg-slate-900 flex justify-around">
							<a class="no-decoration text-bold text-slate-200 py-4">Posts</a>
							<a class="no-decoration text-bold text-slate-400 py-4" href="/explore/tags">
								Hashtags
							</a>
							<a class="no-decoration text-bold text-slate-400 py-4" href="/explore/links">
								News
							</a>
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
