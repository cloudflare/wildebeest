import { component$ } from '@builder.io/qwik'
import { Link } from '@builder.io/qwik-city'
import { type MastodonStatus } from '~/types'
import { getDisplayNameElement } from '~/utils/getDisplayNameElement'
import { useAccountUrl } from '~/utils/useAccountUrl'
import { Avatar, type AvatarDetails } from '../avatar'

export const StatusAccountCard = component$<{
	status: MastodonStatus
	subText: 'username' | 'acct'
	secondaryAvatar?: AvatarDetails | null
}>(({ status, subText, secondaryAvatar }) => {
	const accountUrl = useAccountUrl(status.account)

	return (
		<Link
			href={accountUrl}
			class="inline-grid grid-cols-[repeat(2,_max-content)] grid-rows-[1fr,1fr] items-center no-underline"
		>
			<div class="row-span-2">
				<Avatar primary={status.account} secondary={secondaryAvatar ?? null} />
			</div>
			<div class="ml-2 col-start-2 row-start-1">{getDisplayNameElement(status.account)}</div>
			<div class="ml-2 text-wildebeest-400 col-start-2 row-start-2">
				@{subText === 'username' ? status.account.username : status.account.acct}
			</div>
		</Link>
	)
})
