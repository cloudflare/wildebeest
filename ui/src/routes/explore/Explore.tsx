import { component$, Resource, useResource$, useStyles$ } from '@builder.io/qwik'
import { MastodonStatus } from '../../../../types/status'
import { statuses } from '../../dummyData'
import styles from './Explore.scss?inline'

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
						<h2 class="text-reg text-md m0 p4">
							<span class="text-bold mr-3">#</span>Explore
						</h2>
						<div class="bg-slate-900 flex justify-around">
							<a class="no-decoration text-bold text-slate-200 py-4">Posts</a>
							<a class="no-decoration text-bold text-slate-400 py-4" href="/explore/tags">
								Hashtags
							</a>
							<a class="no-decoration text-bold text-slate-400 py-4" href="/explore/links">
								News
							</a>
						</div>
						{statuses.map((status) => {
							const statusUrl = `/@${status.account.username}/${status.account.id}`

							return (
								<div class="p4 border-t border-slate-600">
									<div class="flex justify-between">
										<div class="flex">
											<img class="avatar" src={status.account.avatar} />
											<div class="flex-column ml-3">
												<div class="p1">
													<a class="no-decoration">{status.account.display_name}</a>
												</div>
												<div class="p1 text-slate-500">@{status.account.username}</div>
											</div>
										</div>
										<a class="no-decoration" href={statusUrl}>
											<div class="text-slate-500">
												<i class="fa fa-globe" title="Public" />
												{/* TODO: stop hardcoding */}
												<span class="ml-2">15h</span>
											</div>
										</a>
									</div>
									<div class="leading-snug status-content" dangerouslySetInnerHTML={status.content} />

									{status.card && (
										<a class="no-decoration">
											<div class="rounded flex border border-slate-600">
												<img class="preview-image" src={status.card.image} />
												<div class="p3 overflow-hidden">
													<div class="overflow-ellipsis text-sm text-bold text-slate-400">{status.card.title}</div>
													<div class="overflow-ellipsis mt-2 text-sm text-slate-500">{status.card.provider_name}</div>
												</div>
											</div>
										</a>
									)}
								</div>
							)
						})}
					</>
				)
			}}
		/>
	)
})
