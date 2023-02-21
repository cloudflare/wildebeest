import { component$, Slot } from '@builder.io/qwik'
import type { MastodonStatus } from '~/types'
import { formatDateTime } from '~/utils/dateTime'
import { formatRoundedNumber } from '~/utils/numbers'

export const StatusInfoTray = component$<{ status: MastodonStatus }>(({ status }) => {
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
