import { component$ } from '@builder.io/qwik'

type Props = {
	src: string
}

export const Avatar = component$<Props>(({ src }) => {
	return <img class="rounded h-12 w-12" src={src} />
})
