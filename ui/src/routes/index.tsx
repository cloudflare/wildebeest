import { component$, Resource, useResource$ } from '@builder.io/qwik'
import { DocumentHead } from '@builder.io/qwik-city'
import { Status } from '~/types'
import { statuses } from '../dummyData'

export default component$(() => {
	const resource = useResource$<Status[]>(async () => {
		return statuses
	})

	return (
		<Resource
			value={resource}
			onPending={() => <div>loading...</div>}
			onRejected={() => <div>failed</div>}
			onResolved={(statuses) => {
				return (
					<div class="bg-slate-800 rounded">
						<h2 class="text-reg text-md m0 p4">
							<span class="text-bold">#</span>Explore
						</h2>
						{statuses.map((status) => (
							<div class="p4 border-t border-slate-600">
								<div dangerouslySetInnerHTML={status.content} />
							</div>
						))}
					</div>
				)
			}}
		/>
	)
})

export const head: DocumentHead = {
	title: 'Wildebeest (Mastodon on Cloudflare)',
	meta: [
		{
			name: 'description',
			content: 'A frontend for a mastodon server deployed on Cloudflare.',
		},
	],
}
