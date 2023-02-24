import { component$ } from '@builder.io/qwik'
import { Link } from '@builder.io/qwik-city'
import { type Account } from '~/types'
import { getDisplayNameElement } from '~/utils/getDisplayNameElement'
import { useAccountUrl } from '~/utils/useAccountUrl'
import { Avatar, type AvatarDetails } from '../avatar'

export const AccountCard = component$<{
	account: Account
	subText: 'username' | 'acct'
	secondaryAvatar?: AvatarDetails | null
}>(({ account, subText, secondaryAvatar }) => {
	const accountUrl = useAccountUrl(account)

	return (
		<Link href={accountUrl} class="inline-flex items-center no-underline flex-wrap gap-2">
			<div class="flex-grow flex-shrink-0 flex justify-center">
				<Avatar primary={account} secondary={secondaryAvatar ?? null} />
			</div>
			<div>
				<div data-testid="account-display-name">{getDisplayNameElement(account)}</div>
				<div class="text-wildebeest-400">@{subText === 'username' ? account.username : account.acct}</div>
			</div>
		</Link>
	)
})
