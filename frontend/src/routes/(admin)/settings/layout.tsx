import { component$, Slot } from '@builder.io/qwik'
import { WildebeestLogo } from '~/components/MastodonLogo'

export default component$(() => {
	return (
		<div class="flex w-screen h-screen justify-center">
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
				{/* <ul class="mr-5">
					<li>Account</li>
				</ul> */}
			</div>
		</div>
	)
})
