import { component$, $, useStyles$ } from '@builder.io/qwik'
import { useNavigate } from '@builder.io/qwik-city'
import { formatTimeAgo } from '~/utils/dateTime'
import { MastodonStatus } from '~/types'
import styles from './Status.scss?inline'

type Props = {
	status: MastodonStatus
}

export default component$((props: Props) => {
	useStyles$(styles)
	const nav = useNavigate()

	const status = props.status

	const accountUrl = `/@${status.account.username}`
	const statusUrl = `${accountUrl}/${status.id}`

	const handleContentClick = $(() => {
		nav.path = statusUrl
	})

	return (
		<div class="p-4 border-t border-slate-600 pointer" onClick$={handleContentClick}>
			<div class="flex justify-between">
				<div class="flex">
					<img class="avatar" src={status.account.avatar} />
					<div class="flex-column ml-3">
						<div class="p-1">
							<a class="no-decoration">{status.account.display_name}</a>
						</div>
						<div class="p-1 text-slate-500">@{status.account.username}</div>
					</div>
				</div>
				<a class="no-decoration" href={statusUrl}>
					<div class="text-slate-500 flex items-center">
						<i class="fa fa-xs fa-globe" />
						<span class="ml-2 text-sm">{formatTimeAgo(new Date(status.created_at))}</span>
					</div>
				</a>
			</div>
			<div class="leading-snug status-content" dangerouslySetInnerHTML={status.content} />

			{status.card && (
				<a class="no-decoration" href={status.card.url}>
					<div class="rounded flex border border-slate-600">
						<img class="preview-image" src={status.card.image} />
						<div class="p-3 overflow-hidden">
							<div class="overflow-ellipsis text-sm text-bold text-slate-400">{status.card.title}</div>
							<div class="overflow-ellipsis mt-2 text-sm text-slate-500">{status.card.provider_name}</div>
						</div>
					</div>
				</a>
			)}
		</div>
	)
})
