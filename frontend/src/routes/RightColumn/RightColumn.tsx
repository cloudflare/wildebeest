import { component$, useStylesScoped$ } from '@builder.io/qwik'
import { useLocation } from '@builder.io/qwik-city'
import { MastodonLogo } from '~/components/MastodonLogo'
import styles from './RightColumn.scss?inline'

type LinkConfig = {
	iconName: string
	linkText: string
	linkTarget: string
}

export const RightColumn = component$(() => {
	useStylesScoped$(styles)
	const location = useLocation()

	const renderNavLink = ({ iconName, linkText, linkTarget }: LinkConfig) => {
		let classList = 'mx-4 my-5 block no-decoration text-semi max-w-max ' + location.pathname

		if (location.pathname.replace(/\/$/, '') === `${linkTarget}`) {
			classList += ' text-indigo-400'
		} else {
			classList += ' hover:text-white focus:text-white'
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
		<div class="flex flex-column justify-between container text-slate-400">
			<div>
				<div class="p-4">
					<a href="https://mastodon.social">
						<MastodonLogo size="small" />
					</a>
				</div>
				<hr class="border-t border-slate-700 my-3" />
				{links.map((link) => renderNavLink(link))}
			</div>
		</div>
	)
})
