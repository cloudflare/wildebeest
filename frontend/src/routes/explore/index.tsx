import { component$ } from '@builder.io/qwik'
import { DocumentHead } from '@builder.io/qwik-city'
import Explore from './Explore'

export default component$(() => {
	return <Explore />
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
