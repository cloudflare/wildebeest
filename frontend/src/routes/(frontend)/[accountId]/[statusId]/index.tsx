import { component$, Slot } from '@builder.io/qwik'
import { MastodonStatus, StatusContext } from '~/types'
import Status from '~/components/Status'
import { formatDateTime } from '~/utils/dateTime'
import { formatRoundedNumber } from '~/utils/numbers'
import * as statusAPI from 'wildebeest/functions/api/v1/statuses/[id]'
import { Link, loader$ } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { Avatar } from '~/components/avatar'

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
	const { status, context } = statusLoader.use().value
	const mediaAttachment = (status.media_attachments && status.media_attachments[0]) || null

	return (
		<>
			<StickyHeader>
				<div class="flex justify-between items-center xl:rounded-t header bg-wildebeest-700">
					<Link class="text-semi no-underline text-wildebeest-vibrant-400 bg-transparent p-4" href="/explore">
						<i class="fa fa-chevron-left mr-2" />
						<span class="hover:underline">Back</span>
					</Link>
				</div>
			</StickyHeader>
			<div class="bg-wildebeest-700 p-4">
				<AccountCard status={status} />

				<div class="leading-normal status-content text-lg" dangerouslySetInnerHTML={status.content} />

				{mediaAttachment && (
					<div class="flex justify-center" style={{ height: `${mediaAttachment.meta.small.height}px` }}>
						{mediaAttachment.preview_url && <img class="rounded" src={mediaAttachment.preview_url} />}
					</div>
				)}

				<InfoTray status={status} />
			</div>
			<div>
				{context.descendants.map((status) => {
					return <Status status={status} />
				})}
			</div>
		</>
	)
})

export const AccountCard = component$<{ status: MastodonStatus }>(({ status }) => {
	return (
		<div class="flex">
			<Avatar primary={status.account} secondary={null} />
			<div class="flex flex-col">
				<div class="p-1">
					{/* TODO: this should either have an href or not being an `a` element (also consider using QwikCity's `Link` instead) */}
					<a class="no-underline">{status.account.display_name}</a>
				</div>
				<div class="p-1 text-wildebeest-400">@{status.account.acct}</div>
			</div>
		</div>
	)
})

export const InfoTray = component$<{ status: MastodonStatus }>(({ status }) => {
	return (
		<div class="text-wildebeest-500 mt-4 text-sm">
			<Info href={status.url}>
				<span>{formatDateTime(status.created_at)}</span>
			</Info>
			<span> · </span>
			<span>
				<i class="fa fa-globe mx-3" />
				<span>Web</span>
			</span>
			<span> · </span>
			<Info href={status.url ? `${status.url}/reblogs` : null}>
				<i class="fa fa-retweet mx-3" />
				<span>{formatRoundedNumber(status.reblogs_count)}</span>
			</Info>
			<span> · </span>
			<Info href={status.url ? `${status.url}/favourites` : null}>
				<i class="fa fa-star mx-3" />
				<span>{formatRoundedNumber(status.favourites_count)}</span>
			</Info>
		</div>
	)
})

export const Info = component$<{ href: string | null }>(({ href }) => {
	return (
		<>
			{!href ? (
				<span>
					<Slot />
				</span>
			) : (
				<a href={href} class="no-underline">
					<Slot />
				</a>
			)}
		</>
	)
})
