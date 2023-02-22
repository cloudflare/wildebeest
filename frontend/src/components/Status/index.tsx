import { component$, $, useSignal } from '@builder.io/qwik'
import { Link, useNavigate } from '@builder.io/qwik-city'
import { formatTimeAgo } from '~/utils/dateTime'
import type { Account, MastodonStatus } from '~/types'
import { MediaGallery } from '../MediaGallery.tsx'
import { useAccountUrl } from '~/utils/useAccountUrl'
import { getDisplayNameElement } from '~/utils/getDisplayNameElement'
import { AccountCard } from '../AccountCard/AccountCard'
import { HtmlContent } from '../HtmlContent/HtmlContent'
import { StatusInfoTray } from '../StatusInfoTray/StatusInfoTray'

type Props = {
	status: MastodonStatus
	accountSubText: 'username' | 'acct'
	showInfoTray: boolean
	contentClickable: boolean
}

export default component$((props: Props) => {
	const nav = useNavigate()

	const status = props.status.reblog ?? props.status
	const reblogger = props.status.reblog && props.status.account

	const accountUrl = useAccountUrl(status.account)
	const statusUrl = `${accountUrl}/${status.id}`

	const showContent = useSignal(!status.spoiler_text)

	const handleContentClick = $(() => props.contentClickable && nav(statusUrl))

	return (
		<article class="p-4 border-t border-wildebeest-700 break-words">
			<RebloggerLink account={reblogger}></RebloggerLink>
			<div class="flex justify-between mb-3 flex-wrap">
				<AccountCard account={status.account} subText={props.accountSubText} secondaryAvatar={reblogger} />
				<Link class="no-underline ml-auto" href={statusUrl}>
					<div class="text-wildebeest-500 flex items-baseline">
						<i style={{ height: '0.75rem', width: '0.75rem' }} class="fa fa-xs fa-globe w-3 h-3" />
						<span class="ml-2 text-sm hover:underline min-w-max">{formatTimeAgo(new Date(status.created_at))}</span>
					</div>
				</Link>
			</div>

			{status.spoiler_text && (
				<div class="my-4 flex items-center">
					<span class={props.contentClickable ? 'cursor-pointer' : ''} onClick$={handleContentClick}>
						{status.spoiler_text}
					</span>
					<button
						class="bg-wildebeest-500 text-wildebeest-900 uppercase font-semibold text-xs p-1 rounded opacity-50 ml-4"
						onClick$={() => (showContent.value = !showContent.value)}
					>
						show {showContent.value ? 'less' : 'more'}
					</button>
				</div>
			)}

			{showContent.value && (
				<>
					<div class={props.contentClickable ? 'cursor-pointer' : ''} onClick$={handleContentClick}>
						<HtmlContent html={status.content} />
					</div>

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
				</>
			)}

			{props.showInfoTray && <StatusInfoTray status={status} />}
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
