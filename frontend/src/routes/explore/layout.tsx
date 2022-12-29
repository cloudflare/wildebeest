import { component$, Slot, useStylesScoped$ } from '@builder.io/qwik'
import { useLocation } from '@builder.io/qwik-city'
import styles from './layout.scss?inline'

type LinkConfig = {
	linkText: string
	linkTarget: string
}

export default component$(() => {
	useStylesScoped$(styles)
	const location = useLocation()

	const renderNavLink = ({ linkText, linkTarget }: LinkConfig) => {
		let classList = 'no-decoration text-bold text-slate-200 py-4'

		// Color the active link indigo, stripping any trailing slash.
		if (location.pathname.replace(/\/$/, '') === linkTarget) {
			classList += ' active'
		}

		return (
			<a href={linkTarget} class={classList}>
				{linkText}
			</a>
		)
	}

	const links = [
		{
			linkText: 'Posts',
			linkTarget: '/explore',
		},
		{
			linkText: 'Hashtags',
			linkTarget: '/explore/tags',
		},
		{
			linkText: 'News',
			linkTarget: '/explore/links',
		},
	]

	return (
		<div class="container">
			<div class="header-wrapper">
				<h2 class="text-reg text-md m-0 p-4 bg-slate-700 rounded-t">
					<i class="fa fa-hashtag fa-fw mr-3" />
					<span>Explore</span>
				</h2>
			</div>
			<div class="bg-slate-900 flex justify-around">{links.map((link) => renderNavLink(link))}</div>
			<div class="content-container">
				<Slot />
			</div>
		</div>
	)
})
