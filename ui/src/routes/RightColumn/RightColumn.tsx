import { component$ } from '@builder.io/qwik'
import { MastodonLogo } from './MastodonLogo'

export const RightColumn = component$(() => {
	return (
		<div>
			<div class="p4">
				<a href="https://mastodon.social">
					<MastodonLogo />
				</a>
			</div>
			<hr class="border-t border-slate-700 my-3" />
			<a href="/explore" class="p3 block no-decoration text-indigo-400 text-semi">
				# Explore
			</a>
			<a href="/explore" class="p3 block no-decoration text-semi">
				Local
			</a>
			<a href="/explore" class="p3 block no-decoration text-semi">
				Federated
			</a>
		</div>
	)
})
