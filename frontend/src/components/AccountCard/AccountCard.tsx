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
		<Link
			href={accountUrl}
			class="inline-grid grid-cols-[repeat(2,_max-content)] grid-rows-[1fr,1fr] items-center no-underline"
		>
			<div class="row-span-2">
				<Avatar primary={account} secondary={secondaryAvatar ?? null} />
			</div>
			<div data-testid="account-display-name" class="ml-2 col-start-2 row-start-1">
				{getDisplayNameElement(account)}
			</div>
			<div class="ml-2 text-wildebeest-400 col-start-2 row-start-2">
				@{subText === 'username' ? account.username : account.acct}
			</div>
		</Link>
	)
})
