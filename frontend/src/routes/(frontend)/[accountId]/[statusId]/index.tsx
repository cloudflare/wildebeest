import { component$, Slot, useStyles$ } from '@builder.io/qwik'
import { MastodonStatus, StatusContext } from '~/types'
import Status from '~/components/Status'
import { formatDateTime } from '~/utils/dateTime'
import { formatRoundedNumber } from '~/utils/numbers'
import * as statusAPI from 'wildebeest/functions/api/v1/statuses/[id]'
import * as contextAPI from 'wildebeest/functions/api/v1/statuses/[id]/context'
import { DocumentHead, Link, loader$ } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { Avatar } from '~/components/avatar'
import { MediaGallery } from '~/components/MediaGallery.tsx'
import { getNotFoundHtml } from '~/utils/getNotFoundHtml/getNotFoundHtml'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import styles from '../../../../utils/innerHtmlContent.scss?inline'
import { getTextContent } from 'wildebeest/backend/src/activitypub/objects'
import { getDocumentHead } from '~/utils/getDocumentHead'

export const statusLoader = loader$<
	{ DATABASE: D1Database },
	Promise<{ status: MastodonStatus; statusTextContent: string; context: StatusContext }>
>(async ({ request, html, platform, params }) => {
	const domain = new URL(request.url).hostname
	let statusText = ''
	try {
		const statusResponse = await statusAPI.handleRequestGet(platform.DATABASE, params.statusId, domain)
		statusText = await statusResponse.text()
	} catch {
		throw html(500, getErrorHtml('An error occurred whilst retrieving the status data, please try again later'))
	}
	if (!statusText) {
		throw html(404, getNotFoundHtml())
	}
	const status: MastodonStatus = JSON.parse(statusText)
	const statusTextContent = await getTextContent(status.content)

	try {
		const contextResponse = await contextAPI.handleRequest(domain, platform.DATABASE, params.statusId)
		const contextText = await contextResponse.text()
		const context = JSON.parse(contextText ?? null) as StatusContext | null
		if (!context) {
			throw new Error(`No context present for status with ${params.statusId}`)
		}
		return { status, statusTextContent, context }
	} catch {
		throw html(500, getErrorHtml('No context for the status has been found, please try again later'))
	}
})

export default component$(() => {
	useStyles$(styles)

	const loaderData = statusLoader.use().value

	return (
		<>
			<StickyHeader withBackButton />
			<div class="bg-wildebeest-700 p-4">
				<AccountCard status={loaderData.status} />
				<div class="leading-normal inner-html-content text-lg" dangerouslySetInnerHTML={loaderData.status.content} />

				<MediaGallery medias={loaderData.status.media_attachments} />

				<InfoTray status={loaderData.status} />
			</div>
			<div>
				{loaderData.context.descendants.map((status) => {
					return <Status status={status} />
				})}
			</div>
		</>
	)
})

export const AccountCard = component$<{ status: MastodonStatus }>(({ status }) => {
	const accountUrl = `/@${status.account.username}`

	return (
		<div class="flex">
			<Avatar primary={status.account} secondary={null} />
			<div class="flex flex-col">
				<div class="p-1">
					<Link href={accountUrl} class="no-underline">
						{status.account.display_name}
					</Link>
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
			<span class="ml-3"> · </span>
			<span>
				<i class="fa fa-globe mx-3 w-4 inline-block" />
				<span>Web</span>
			</span>
			<span class="ml-3"> · </span>
			<Info href={status.url ? `${status.url}/reblogs` : null}>
				<i class="fa fa-retweet mx-3 w-4 inline-block" />
				<span>{formatRoundedNumber(status.reblogs_count)}</span>
			</Info>
			<span class="ml-3"> · </span>
			<Info href={status.url ? `${status.url}/favourites` : null}>
				<i class="fa fa-star mx-3 w-4 inline-block" />
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

export const head: DocumentHead = ({ getData }) => {
	const { status, statusTextContent } = getData(statusLoader)

	const title = `${status.account.display_name}: ${statusTextContent.substring(0, 30)}${
		statusTextContent.length > 30 ? '…' : ''
	} - Wildebeest`

	return getDocumentHead({
		title,
		description: statusTextContent,
		og: {
			type: 'article',
			url: status.url,
			image: status.account.avatar,
		},
	})
}
