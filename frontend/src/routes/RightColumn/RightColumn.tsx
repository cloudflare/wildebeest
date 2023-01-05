import { component$, useStylesScoped$ } from '@builder.io/qwik'
import { Link, useLocation } from '@builder.io/qwik-city'
import { MastodonLogo, WildebeestLogo } from '~/components/MastodonLogo'
import styles from './RightColumn.scss?inline'

type LinkConfig = {
	iconName: string
	linkText: string
	linkTarget: string
	linkActiveRegex: RegExp
}

export const RightColumn = component$(() => {
	useStylesScoped$(styles)
	const location = useLocation()

	const renderNavLink = ({ iconName, linkText, linkTarget, linkActiveRegex }: LinkConfig) => {
		let classList = 'mx-4 my-5 block no-underline text-semi max-w-max ' + location.pathname

		if (linkActiveRegex.test(location.pathname)) {
			classList += ' text-indigo-400'
		} else {
			classList += ' hover:text-white focus:text-white'
		}

		return (
			<Link href={linkTarget} class={classList}>
				<i class={`fa ${iconName} fa-fw mr-3`} />
				{linkText}
			</Link>
		)
	}

	const links = [
		{ iconName: 'fa-hashtag', linkText: 'Explore', linkTarget: '/explore', linkActiveRegex: /^\/explore/ },
		{ iconName: 'fa-users', linkText: 'Local', linkTarget: '/public/local', linkActiveRegex: /^\/public\/local/ },
		{ iconName: 'fa-globe', linkText: 'Federated', linkTarget: '/public', linkActiveRegex: /^\/public\/?$/ },
	]

	return (
		<div class="flex flex-col justify-between right-column-wrapper text-slate-400">
			<div>
				<div class="p-4">
					<a class="no-underline flex items-center" href="https://mastodon.social">
						<WildebeestLogo size="small" />
						<span class="text-white font-bold text-xl ml-[-27px] mt-[-27px]">ildebeest</span>
					</a>
				</div>
				<hr class="border-t border-slate-700 my-3" />
				{links.map((link) => renderNavLink(link))}
			</div>
		</div>
	)
})
