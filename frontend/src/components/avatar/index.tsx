import { component$ } from '@builder.io/qwik'
import type { Account } from '~/types'
import { useAccountUrl } from '~/utils/useAccountUrl'

type AvatarDetails = Partial<Pick<Account, 'id'>> & Pick<Account, 'display_name' | 'avatar' | 'url'>

type Props = {
	primary: AvatarDetails
	secondary: AvatarDetails | null
}

export const Avatar = component$<Props>(({ primary, secondary }) => {
	const primaryUrl = useAccountUrl(primary)
	const secondaryUrl = useAccountUrl(secondary)

	return (
		<div class={`relative ${secondary && 'pr-2 pb-2'}`}>
			<a href={primaryUrl}>
				<img class="rounded h-12 w-12" src={primary.avatar} alt={`Avatar of ${primary.display_name}`} />
			</a>
			{secondary && (
				<a href={secondaryUrl}>
					<img
						class="absolute right-0 bottom-0 rounded h-6 w-6"
						src={secondary.avatar}
						alt={`Avatar of ${secondary.display_name}`}
					/>
				</a>
			)}
		</div>
	)
})
