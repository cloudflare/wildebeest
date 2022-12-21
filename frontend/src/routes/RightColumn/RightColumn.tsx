import { component$, Resource, useResource$, useStyles$ } from '@builder.io/qwik'
import { useLocation } from '@builder.io/qwik-city'
import { Sparkline } from '~/components/Sparkline'
import TagDetailsCard from '~/components/TagDetailsCard'
import { tags } from '~/dummyData'
import { TagDetails } from '~/types'
import { MastodonLogo } from './MastodonLogo'
import styles from './RightColumn.scss?inline'

type LinkConfig = {
	iconName: string
	linkText: string
	linkTarget: string
}

export const RightColumn = component$(() => {
	useStyles$(styles)
	const location = useLocation()

	const resource = useResource$<TagDetails[]>(async () => {
		return tags
	})

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
		<div class="flex flex-column justify-between container text-slate-400">
			<div>
				<div class="p4">
					<a href="https://mastodon.social">
						<MastodonLogo />
					</a>
				</div>
				<hr class="border-t border-slate-700 my-3" />
				{links.map((link) => renderNavLink(link))}
			</div>
			<Resource
				value={resource}
				onPending={() => <></>}
				onRejected={() => <div>failed</div>}
				onResolved={(tags) => {
					const top3 = tags.slice(0, 3)
					return (
						<div class="mb-4">
							<div class="px-4 text-uppercase text-sm text-bold">Trending Now</div>
							<hr class="border-t border-slate-600 my-4" />
							<div class="px-4">
								{top3.map((tagDetails) => (
									<div class="mb-4">
										<TagDetailsCard tagDetails={tagDetails} />
									</div>
								))}
							</div>
						</div>
					)
				}}
			/>
		</div>
	)
})
