import { component$ } from '@builder.io/qwik'
import Spinner from '../Spinner'

type Props = {
	loading: boolean
	text: string
}

export const SubmitButton = component$<Props>(({ text, loading }) => {
	return (
		<button
			type="submit"
			class="w-full my-10 relative bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-2 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
		>
			{text}
			{loading && (
				<div class="absolute inset-0 bg-[#00000078] grid place-items-center cursor-progress">
					<Spinner />
				</div>
			)}
		</button>
	)
})
