import { component$ } from '@builder.io/qwik'

type Props = {
	src: string
}

export const Avatar = component$<Props>(({ src }) => {
	return <img class="rounded" style={{ width: '46px', height: '46px' }} src={src} />
})
