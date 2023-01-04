import { component$, useStyles$ } from '@builder.io/qwik'
import { MastodonStatus, StatusContext } from '~/types'
import styles from './index.scss?inline'
import Status from '~/components/Status'
import { formatDateTime } from '~/utils/dateTime'
import { formatRoundedNumber } from '~/utils/numbers'
import * as statusAPI from 'wildebeest/functions/api/v1/statuses/[id]'
import { Link, loader$ } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'

export const statusLoader = loader$<
	{ DATABASE: D1Database; domain: string },
	Promise<{ status: MastodonStatus; context: StatusContext }>
>(async ({ platform, params }) => {
	const response = await statusAPI.handleRequest(platform.DATABASE, params.statusId)
	const results = await response.text()
	// Manually parse the JSON to ensure that Qwik finds the resulting objects serializable.
	return { status: JSON.parse(results), context: { ancestors: [], descendants: [] } }
})

export default component$(() => {
	useStyles$(styles)

	const { status, context } = statusLoader.use().value
	const mediaAttachment = (status.media_attachments && status.media_attachments[0]) || null

	return (
		<>
			<StickyHeader>
				<div class="flex justify-between items-center rounded-t header bg-slate-700">
					<Link class="text-semi back-button p-4" href="/explore">
						<i class="fa fa-chevron-left mr-2" />
						<span class="back-button-text">Back</span>
					</Link>
					<i class="fa fa-eye mr-4 text-slate-400" />
				</div>
			</StickyHeader>
			<div class="bg-slate-700 p-4">
				{/* Account Card */}
				<div class="flex">
					<img class="avatar" src={status.account.avatar} />
					<div class="flex flex-col">
						<div class="p-1">
							{/* TODO: this should either have an href or not being an `a` element (also consider using QwikCity's `Link` instead) */}
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
})
