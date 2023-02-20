import { component$, Slot, useSignal } from '@builder.io/qwik'

type Props = {
	title: string
}

export const Accordion = component$<Props>(({ title }) => {
	const headerId = useSignal(
		`accordion-${title.replace(/\s/g, '_')}-${`${Math.round(Math.random() * 99999)}`.padStart(5, '0')}`
	).value

	const expanded = useSignal(false)

	return (
		<div class="bg-wildebeest-600 border border-wildebeest-700 rounded overflow-hidden">
			<header id={headerId} class=" bg-wildebeest-700 text-wildebeest-vibrant-400">
				<button
					class="py-4 px-5 text-start w-full flex items-center"
					onClick$={() => (expanded.value = !expanded.value)}
				>
					<i class={`fa-solid fa-chevron-${expanded.value ? 'down' : 'right'} mr-3 text-xl`}></i>
					<span class="font-semibold">{title}</span>
				</button>
			</header>
			{expanded.value && (
				<section aria-labelledby={headerId}>
					<Slot />
				</section>
			)}
		</div>
	)
})
