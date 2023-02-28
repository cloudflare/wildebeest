import { component$, Slot } from '@builder.io/qwik'
import { WildebeestLogo } from '~/components/MastodonLogo'

export default component$(() => {
	return (
		<div class="flex w-screen min-h-screen justify-center">
			<AccountSidebar />
			<div class="flex-auto">
				<Slot />
			</div>
			<div class="flex-auto" />
		</div>
	)
})

export const AccountSidebar = component$(() => {
	return (
		<div class="bg-wildebeest-800 min-h-full flex-auto">
			<div class="flex flex-col items-end">
				<div class="my-12 mr-6">
					<WildebeestLogo size="large" />
				</div>
				<a class="text-semi no-underline text-wildebeest-vibrant-400 bg-transparent p-4" href="/">
					<i class="fa fa-chevron-left mr-2 w-3 inline-block" />
					<span class="hover:underline">Back to Wildebeest</span>
				</a>
				<ul class="mr-5">
					{/* <li class="mb-3">
						<a class="no-underline text-right text-wildebeest-400 hover:text-wildebeest-200" href="/settings/migration">
							Account Migration
						</a>
					</li> */}
					<li class="mb-3">
						<a class="no-underline text-right text-wildebeest-400 hover:text-wildebeest-200" href="/settings/aliases">
							Account Aliases
						</a>
					</li>
				</ul>
			</div>
		</div>
	)
})
