import { component$ } from '@builder.io/qwik'
import type { DocumentHead } from '@builder.io/qwik-city'

export default component$(() => {
    return (
        <div>
            <h1>Welcome to the Wildebeest (Mastodon on Cloudflare).</h1>
        </div>
    )
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
