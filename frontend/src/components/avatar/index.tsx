import { component$ } from '@builder.io/qwik'

type Props = {
	src: string
	accountDisplayName: string
}

export const Avatar = component$<Props>(({ src, accountDisplayName }) => {
	return <img class="rounded h-12 w-12" src={src} alt={`Avatar of ${accountDisplayName}`} />
})
