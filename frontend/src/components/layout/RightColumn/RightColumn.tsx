import { component$ } from '@builder.io/qwik'
import { Link, useLocation } from '@builder.io/qwik-city'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { authLoader } from '~/routes/layout'

type LinkConfig = {
	iconName: string
	linkText: string
	linkTarget: string
	linkActiveRegex: RegExp
}

export default component$(() => {
	const { isAuthorized, loginUrl } = authLoader().value
	const location = useLocation()

	const renderNavLink = ({ iconName, linkText, linkTarget, linkActiveRegex }: LinkConfig) => {
		let classList = 'mx-4 my-5 h-5 flex no-underline text-semi max-w-max ' + location.pathname

		if (linkActiveRegex.test(location.pathname)) {
			classList += ' text-wildebeest-vibrant-400'
		} else {
			classList += ' hover:text-white focus:text-white'
		}

		return (
			<Link href={linkTarget} class={classList} aria-label={linkText}>
				<i class={`fa ${iconName} fa-fw md:mr-3 w-5 leading-tight inline-block`} />
				<span class="hidden md:inline">{linkText}</span>
			</Link>
		)
	}

	const links = [
		{ iconName: 'fa-hashtag', linkText: 'Explore', linkTarget: '/explore', linkActiveRegex: /^\/explore/ },
		{ iconName: 'fa-users', linkText: 'Local', linkTarget: '/public/local', linkActiveRegex: /^\/public\/local/ },
		{ iconName: 'fa-globe', linkText: 'Federated', linkTarget: '/public', linkActiveRegex: /^\/public\/?$/ },
	]

	const aboutLink = { iconName: 'fa-ellipsis', linkText: 'About', linkTarget: '/about', linkActiveRegex: /^\/about/ }

	return (
		<div class="bg-wildebeest-600 xl:bg-transparent flex flex-col justify-between right-column-wrapper text-wildebeest-200 flex-1 z-10">
			<div class="sticky top-[3.9rem] xl:top-0">
				<div class="xl:p-4">
					<Link class="no-underline hidden xl:flex items-center" aria-label="Wildebeest Home" href={'/'}>
						<WildebeestLogo size="medium" />
					</Link>
				</div>
				<hr class="hidden xl:block border-t border-wildebeest-700 my-3" />
				{links.map((link) => renderNavLink(link))}
				<div class="xl:hidden">
					<hr class="border-t border-wildebeest-700 my-3" />
					{renderNavLink(aboutLink)}
				</div>

				{!isAuthorized && (
					<a
						class="w-full block mb-4 no-underline text-center bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-2 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
						href={`${loginUrl}`}
					>
						Sign in
					</a>
				)}
				{isAuthorized && (
					<a class="text-semi no-underline" href="/settings/migration">
						<i class="fa fa-gear mx-3 w-4" />
						Preferences
					</a>
				)}
			</div>
		</div>
	)
})
