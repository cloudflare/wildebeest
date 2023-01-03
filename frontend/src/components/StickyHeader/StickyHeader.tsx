import { component$, Slot } from '@builder.io/qwik'
import { useStylesScoped$ } from '@builder.io/qwik'
import styles from './StickyHeader.scss?inline'

export default component$(() => {
	useStylesScoped$(styles)

	return (
		<header>
			<Slot />
		</header>
	)
})
