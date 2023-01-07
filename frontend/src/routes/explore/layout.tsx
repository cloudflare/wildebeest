import { component$, Slot, useStylesScoped$ } from '@builder.io/qwik'
import { Link, useLocation } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import styles from './layout.scss?inline'

type LinkConfig = {
	linkText: string
	linkTarget: string
}

export default component$(() => {
	useStylesScoped$(styles)
	const location = useLocation()

	const renderNavLink = ({ linkText, linkTarget }: LinkConfig) => {
		const isActive = location.pathname.replace(/\/$/, '') === linkTarget

		return (
			<div class={`py-4 ${isActive ? 'active' : ''}`}>
				<Link href={linkTarget} class="no-underline text-bold text-slate-200 py-4">
					{linkText}
				</Link>
			</div>
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
		<div class="explore-wrapper flex flex-col">
			<StickyHeader>
				<h2 class="text-reg text-md m-0 p-4 bg-slate-700 xl:rounded-t">
					<i class="fa fa-hashtag fa-fw mr-3" />
					<span>Explore</span>
				</h2>
			</StickyHeader>
			<div class="bg-slate-900 flex justify-around">{links.map((link) => renderNavLink(link))}</div>
			<div class="flex-auto">
				<Slot />
			</div>
		</div>
	)
})
