import { component$, Slot } from '@builder.io/qwik'

export { authLoader } from '~/utils/authLoader'

export default component$(() => {
	return (
		<>
			<Slot />
		</>
	)
})
