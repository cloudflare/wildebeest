import { component$ } from '@builder.io/qwik'
import { useLocation } from '@builder.io/qwik-city'
import { MastodonLogo } from './MastodonLogo'

type LinkConfig = {
	iconName: string
	linkText: string
	linkTarget: string
}

export const RightColumn = component$(() => {
	const location = useLocation()

	const renderNavLink = ({ iconName, linkText, linkTarget }: LinkConfig) => {
		let classList = 'p4 block no-decoration text-semi'

		// Color the active link indigo. Qwik pathnames always include a trailing `/`
		if (location.pathname === `${linkTarget}/`) {
			classList += ' text-indigo-400'
		}

		return (
			<a href={linkTarget} class={classList}>
				<i class={`fa ${iconName} fa-fw mr-3`} />
				{linkText}
			</a>
		)
	}

	const links = [
		{ iconName: 'fa-hashtag', linkText: 'Explore', linkTarget: '/explore' },
		{ iconName: 'fa-users', linkText: 'Local', linkTarget: '/public/local' },
		{ iconName: 'fa-globe', linkText: 'Federated', linkTarget: '/public' },
	]

	return (
		<div>
			<div class="p4">
				<a href="https://mastodon.social">
					<MastodonLogo />
				</a>
			</div>
			<hr class="border-t border-slate-700 my-3" />
			{links.map((link) => renderNavLink(link))}
		</div>
	)
})
