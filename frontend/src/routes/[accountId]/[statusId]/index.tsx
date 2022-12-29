import { component$, Resource, useStyles$ } from '@builder.io/qwik'
// import { useLocation } from '@builder.io/qwik-city'
import { MastodonStatus, StatusContext } from '~/types'
import styles from './index.scss?inline'
import Status from '~/components/Status'
import { formatDateTime } from '~/utils/dateTime'
import { formatRoundedNumber } from '~/utils/numbers'
import { RequestHandler, useEndpoint } from '@builder.io/qwik-city'
import * as statusAPI from 'wildebeest/functions/api/v1/statuses/[id]'

export const onGet: RequestHandler<{ status: MastodonStatus; context: StatusContext }, { DATABASE: any }> = async ({
	platform,
	params,
}) => {
	const response = await statusAPI.handleRequest(platform.DATABASE, params.statusId)
	const results = await response.text()
	console.log(results)
	// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
	return { status: JSON.parse(results), context: { ancestors: [], descendants: [] } }
}

export default component$(() => {
	useStyles$(styles)

	const resource = useEndpoint<{ status: MastodonStatus; context: StatusContext }>()

	return (
		<Resource
			value={resource}
			onPending={() => <div>loading...</div>}
			onRejected={() => <div>failed</div>}
			onResolved={({ context, status }) => {
				const mediaAttachment = (status.media_attachments && status.media_attachments[0]) || null

				return (
					<>
						{/* Header */}
						<div class="flex justify-between items-center rounded-t header bg-slate-700">
							<a class="text-semi back-button p-4" href="/explore">
								<i class="fa fa-chevron-left mr-2" />
								<span class="back-button-text">Back</span>
							</a>
							<i class="fa fa-eye mr-4 text-slate-400" />
						</div>
						<div class="bg-slate-700 p-4">
							{/* Account Card */}
							<div class="flex">
								<img class="avatar" src={status.account.avatar} />
								<div class="flex flex-column">
									<div class="p-1">
										<a class="no-decoration">{status.account.display_name}</a>
									</div>
									<div class="p-1 text-slate-400">@{status.account.acct}</div>
								</div>
							</div>
							{/* Content */}
							<div class="leading-normal status-content text-lg" dangerouslySetInnerHTML={status.content} />
							{/* Media Attachments */}
							{mediaAttachment && (
								<div class="flex justify-center" style={{ height: `${mediaAttachment.meta.small.height}px` }}>
									{mediaAttachment.preview_url && <img class="rounded" src={mediaAttachment.preview_url} />}
								</div>
							)}
							{/* Info Tray */}
							<div class="text-slate-500 mt-4 text-sm">
								<a href={status.url} class="no-decoration">
									<span>{formatDateTime(status.created_at)}</span>
								</a>
								<span> · </span>
								<span>
									<i class="fa fa-globe mx-3" />
									<span>Web</span>
								</span>
								<span> · </span>
								<a href={`${status.url}/reblogs`} class="no-decoration">
									<i class="fa fa-retweet mx-3" />
									<span>{formatRoundedNumber(status.reblogs_count)}</span>
								</a>
								<span> · </span>
								<a href={`${status.url}/favourites`} class="no-decoration">
									<i class="fa fa-star mx-3" />
									<span>{formatRoundedNumber(status.favourites_count)}</span>
								</a>
							</div>
						</div>
						<div>
							{context.descendants.map((status) => {
								return <Status status={status} />
							})}
						</div>
					</>
				)
			}}
		/>
	)
})
