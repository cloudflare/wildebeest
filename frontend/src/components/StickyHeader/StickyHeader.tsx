import { $, component$, Slot } from '@builder.io/qwik'
import { useNavigate } from '@builder.io/qwik-city'

export default component$<{ withBackButton?: boolean; backButtonPlacement?: 'start' | 'end' }>(
	({ withBackButton, backButtonPlacement = 'start' }) => {
		const nav = useNavigate()

		const goBack = $(() => {
			if (window.history.length > 1) {
				window.history.back()
			} else {
				nav('/explore')
			}
		})

		const backButton = !withBackButton ? (
			// eslint-disable-next-line qwik/single-jsx-root
			<></>
		) : (
			<div class="flex justify-between items-center bg-wildebeest-700">
				<button class="text-semi no-underline text-wildebeest-vibrant-400 bg-transparent p-4" onClick$={goBack}>
					<i class="fa fa-chevron-left mr-2 w-3 inline-block" />
					<span class="hover:underline">Back</span>
				</button>
			</div>
		)
		return (
			<header class="bg-wildebeest-900 sticky top-[3.9rem] xl:top-0 xl:pt-2.5 z-10">
				<div class="flex bg-wildebeest-700 xl:rounded-t overflow-hidden">
					{backButtonPlacement === 'start' && backButton}
					<Slot />
					{backButtonPlacement === 'end' && <div class="ml-auto">{backButton}</div>}
				</div>
			</header>
		)
	}
)
