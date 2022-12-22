import { component$, Slot, useStylesScoped$ } from '@builder.io/qwik'
import styles from './layout.scss?inline'

export default component$(() => {
	useStylesScoped$(styles)

	return (
		<div class="container">
			<div class="header-wrapper">
				<h2 class="text-reg text-md m0 p4 bg-slate-700 rounded-t">
					<i class="fa fa-hashtag fa-fw mr-3" />
					<span>Explore</span>
				</h2>
			</div>
			<div class="bg-slate-900 flex justify-around">
				<a href="/explore" class="no-decoration text-bold text-slate-200 py-4">
					Posts
				</a>
				<a href="/explore/tags" class="no-decoration text-bold text-slate-400 py-4" href="/explore/tags">
					Hashtags
				</a>
				<a class="no-decoration text-bold text-slate-400 py-4" href="/explore/links">
					News
				</a>
			</div>
			<div class="content-container">
				<Slot />
			</div>
		</div>
	)
})
