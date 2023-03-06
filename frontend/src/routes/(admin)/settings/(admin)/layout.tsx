import { component$, Slot } from '@builder.io/qwik'

export { adminLoader } from '~/utils/adminLoader'

export default component$(() => {
	return (
		<>
			<Slot />
		</>
	)
})
