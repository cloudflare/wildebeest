import { component$, Slot } from '@builder.io/qwik'
// import { Link, useLocation } from '@builder.io/qwik-city'
import StickyHeader from '~/components/StickyHeader/StickyHeader'

// type LinkConfig = {
// 	linkText: string
// 	linkTarget: string
// }

export default component$(() => {
	/*********** Hiding these features (news & hashtag links) until the backend support is available ******************/

	// const location = useLocation()

	// const renderNavLink = ({ linkText, linkTarget }: LinkConfig) => {
	// 	const isActive = location.pathname.replace(/\/$/, '') === linkTarget

	// 	return (
	// 		<div class={`py-4 ${isActive ? activeClasses.join(' ') : ''}`}>
	// 			<Link href={linkTarget} class="no-underline text-bold text-wildebeest-200 py-4">
	// 				{linkText}
	// 			</Link>
	// 		</div>
	// 	)
	// }

	// const links = [
	// 	{
	// 		linkText: 'Posts',
	// 		linkTarget: '/explore',
	// 	},
	// 	{
	// 		linkText: 'Hashtags',
	// 		linkTarget: '/explore/tags',
	// 	},
	// 	{
	// 		linkText: 'News',
	// 		linkTarget: '/explore/links',
	// 	},
	// ]

	return (
		<div class="flex flex-col flex-1">
			<StickyHeader>
				<h2 class="text-reg text-md m-0 p-4 flex bg-wildebeest-700">
					<i class="fa fa-hashtag fa-fw mr-3 w-5 leading-tight inline-block" />
					<span>Explore</span>
				</h2>
			</StickyHeader>
			{/* <div class="bg-wildebeest-800 flex justify-around">{links.map((link) => renderNavLink(link))}</div> */}
			<div class="flex-auto flex flex-col">
				<Slot />
			</div>
		</div>
	)
})

export const activeClasses = [
	'relative',
	'before:block',
	'before:content-[""]',
	'before:absolute',
	'before:w-0',
	'before:h-0',
	'before:bottom-[-1px]',
	'before:left-1/2',
	'before:translate-x-[-50%]',
	'before:border-solid',
	'before:border-t-0',
	'before:border-x-[0.7rem]',
	'before:border-b-[0.7rem]',
	'before:border-x-transparent',
	'before:border-b-wildebeest-500',
	'after:block',
	'after:content-[""]',
	'after:absolute',
	'after:w-0',
	'after:h-0',
	'after:bottom-[-1px]',
	'after:left-1/2',
	'after:translate-x-[-50%]',
	'after:border-solid',
	'after:border-t-0',
	'after:border-x-[0.7rem]',
	'after:border-b-[0.7rem]',
	'after:border-x-transparent',
	'after:border-b-wildebeest-600',
]
