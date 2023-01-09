import { component$, $, useStyles$ } from '@builder.io/qwik'
import { Link, useNavigate } from '@builder.io/qwik-city'
import { formatTimeAgo } from '~/utils/dateTime'
import { MastodonStatus } from '~/types'
import styles from './index.scss?inline'
import { Avatar } from '../avatar'
import Image from './ImageGallery'

type Props = {
	status: MastodonStatus
}

export default component$((props: Props) => {
	useStyles$(styles)
	const nav = useNavigate()

	const status = props.status

	const accountUrl = `/@${status.account.username}`
	const statusUrl = `${accountUrl}/${status.id}`

	const handleContentClick = $(() => nav(statusUrl))

	return (
		<div class="p-4 border-t border-wildebeest-600 pointer">
			<div onClick$={handleContentClick}>
				<div class="flex justify-between mb-3">
					<div class="flex">
						<Avatar src={status.account.avatar} />
						<div class="flex-col ml-3">
							<div>
								{/* TODO: this should either have an href or not being an `a` element (also consider using QwikCity's `Link` instead) */}
								<a class="no-underline">{status.account.display_name}</a>
							</div>
							<div class="text-wildebeest-500">@{status.account.username}</div>
						</div>
					</div>
					<Link class="no-underline" href={statusUrl}>
						<div class="text-wildebeest-500 flex items-center">
							<i class="fa fa-xs fa-globe" />
							<span class="ml-2 text-sm hover:underline">{formatTimeAgo(new Date(status.created_at))}</span>
						</div>
					</Link>
				</div>
				<div class="leading-relaxed status-content" dangerouslySetInnerHTML={status.content} />
			</div>

			{status.media_attachments.length > 0 && <Image mediaAttachment={status.media_attachments[0]} />}

			{status.card && status.media_attachments.length == 0 && (
				<a class="no-underline" href={status.card.url}>
					<div class="rounded flex border border-wildebeest-600">
						<img class="preview-image" src={status.card.image} />
						<div class="p-3 overflow-hidden">
							<div class="overflow-ellipsis text-sm text-bold text-wildebeest-400">{status.card.title}</div>
							<div class="overflow-ellipsis mt-2 text-sm text-wildebeest-500">{status.card.provider_name}</div>
						</div>
					</div>
				</a>
			)}
		</div>
	)
})
