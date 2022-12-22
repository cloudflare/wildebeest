import { component$, useClientEffect$ } from '@builder.io/qwik'
import { DocumentHead, useNavigate } from '@builder.io/qwik-city'

export default component$(() => {
	const nav = useNavigate()

	useClientEffect$(() => {
		nav.path = '/explore'
	})

	return <></>
})

export const head: DocumentHead = {
	title: 'Wildebeest (Mastodon on Cloudflare)',
	meta: [
		{
			name: 'description',
			content: 'A frontend for a mastodon server deployed on Cloudflare.',
		},
	],
}
