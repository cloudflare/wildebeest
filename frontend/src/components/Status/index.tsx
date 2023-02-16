import { component$, $, useStyles$ } from '@builder.io/qwik'
import { Link, useNavigate } from '@builder.io/qwik-city'
import { formatTimeAgo } from '~/utils/dateTime'
import type { Account, MastodonStatus } from '~/types'
import styles from '../../utils/innerHtmlContent.scss?inline'
import { MediaGallery } from '../MediaGallery.tsx'
import { useAccountUrl } from '~/utils/useAccountUrl'
import { getDisplayNameElement } from '~/utils/getDisplayNameElement'
import { StatusAccountCard } from '../StatusAccountCard/StatusAccountCard'

type Props = {
	status: MastodonStatus
}

export default component$((props: Props) => {
	useStyles$(styles)
	const nav = useNavigate()

	const status = props.status.reblog ?? props.status
	const reblogger = props.status.reblog && props.status.account

	const accountUrl = useAccountUrl(status.account)
	const statusUrl = `${accountUrl}/${status.id}`

	const handleContentClick = $(() => nav(statusUrl))

	return (
		<article class="p-4 border-t border-wildebeest-700 break-words sm:break-normal">
			<RebloggerLink account={reblogger}></RebloggerLink>
			<div class="flex justify-between mb-3">
				<StatusAccountCard status={status} subText="username" secondaryAvatar={reblogger} />
				<Link class="no-underline" href={statusUrl}>
					<div class="text-wildebeest-500 flex items-baseline">
						<i style={{ height: '0.75rem', width: '0.75rem' }} class="fa fa-xs fa-globe w-3 h-3" />
						<span class="ml-2 text-sm hover:underline">{formatTimeAgo(new Date(status.created_at))}</span>
					</div>
				</Link>
			</div>
			<div
				onClick$={handleContentClick}
				class="leading-relaxed inner-html-content cursor-pointer"
				dangerouslySetInnerHTML={status.content}
			/>

			<MediaGallery medias={status.media_attachments} />

			{status.card && status.media_attachments.length === 0 && (
				<a class="no-underline" href={status.card.url}>
					<div class="rounded flex border border-wildebeest-600">
						<img class="w-16 h-16" src={status.card.image} />
						<div class="p-3 overflow-hidden">
							<div class="overflow-ellipsis text-sm text-bold text-wildebeest-400">{status.card.title}</div>
							<div class="overflow-ellipsis mt-2 text-sm text-wildebeest-500">{status.card.provider_name}</div>
						</div>
					</div>
				</a>
			)}
		</article>
	)
})

export const RebloggerLink = component$(({ account }: { account: Account | null }) => {
	const accountUrl = useAccountUrl(account)

	return (
		account && (
			<div class="flex text-wildebeest-500 py-3">
				<p>
					<i class="fa fa-retweet mr-3 w-4 inline-block" />
					<a class="no-underline" href={accountUrl}>
						{getDisplayNameElement(account)}
					</a>
					&nbsp;boosted
				</p>
			</div>
		)
	)
})
