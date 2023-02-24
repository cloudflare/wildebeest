import { component$ } from '@builder.io/qwik'
import { Link } from '@builder.io/qwik-city'
import type { Account } from '~/types'
import { useAccountUrl } from '~/utils/useAccountUrl'

export type AvatarDetails = Partial<Pick<Account, 'id'>> & Pick<Account, 'display_name' | 'avatar' | 'url'>

type Props = {
	primary: AvatarDetails
	secondary: AvatarDetails | null
	withLinks?: boolean
}

export const Avatar = component$<Props>(({ primary, secondary, withLinks }) => {
	const primaryUrl = useAccountUrl(primary)
	const secondaryUrl = useAccountUrl(secondary)

	// eslint-disable-next-line qwik/single-jsx-root
	const primaryImg = <img class="rounded h-12 w-12" src={primary.avatar} alt={`Avatar of ${primary.display_name}`} />

	const secondaryImg = (
		<img
			class="absolute right-0 bottom-0 rounded h-6 w-6"
			src={secondary?.avatar}
			alt={`Avatar of ${secondary?.display_name}`}
		/>
	)

	return (
		<div class={`relative ${secondary && 'pr-2 pb-2'}`}>
			{withLinks ? <Link href={primaryUrl}>{primaryImg}</Link> : primaryImg}
			{secondary && (withLinks ? <Link href={secondaryUrl}>{secondaryImg}</Link> : secondaryImg)}
		</div>
	)
})
