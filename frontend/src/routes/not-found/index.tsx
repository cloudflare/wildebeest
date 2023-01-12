import { component$ } from '@builder.io/qwik'
import { DocumentHead } from '@builder.io/qwik-city'

export default component$(() => {
	return (
		<div class="h-screen w-screen bg-wildebeest-600 grid place-items-center">
			<h1 class="text-wildebeest-200 text-xl text-center mx-5">The page you are looking for isn't here.</h1>
		</div>
	)
})

export const head: DocumentHead = () => {
	return {
		title: 'Wildebeest Not Found',
		meta: [
			{
				name: 'description',
				content: 'Wildebeest Page Not Found',
			},
		],
	}
}
