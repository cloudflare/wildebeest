import { component$ } from '@builder.io/qwik'
import { DocumentHead } from '@builder.io/qwik-city'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { useDomain } from '~/utils/useDomain'

export default component$(() => {
	const domain = useDomain()

	return (
		<div class="flex flex-col p-5 items-center">
			<h1 class="text-center mt-7 mb-9 flex items-center">
				<WildebeestLogo size="large" />
			</h1>
			<form method="post" class="flex flex-col w-full max-w-md">
				<div class="flex flex-col mb-6">
					<label class="mb-2 max-w-max text-semi text-sm" for="login-username">
						Username
					</label>
					<div class="flex justify-center items-center flex-wrap gap-1">
						<input
							id="login-username"
							name="username"
							pattern="[^@]+"
							class="bg-black text-white p-3 rounded outline-none border border-black hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500 invalid:border-red-500 flex-1 w-full"
						/>
						<span>@{domain}</span>
					</div>
				</div>
				<div class="flex flex-col mb-6">
					<label class="mb-2 max-w-max text-semi text-sm" for="login-name">
						Display Name
					</label>
					<input
						id="login-name"
						name="name"
						class="bg-black text-white p-3 rounded outline-none border border-black hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
					/>
				</div>
				<button
					type="submit"
					class="mb-9 bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-3 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
				>
					Register
				</button>
			</form>
		</div>
	)
})

export const head: DocumentHead = () => {
	return {
		title: 'Wildebeest Login',
		meta: [
			{
				name: 'description',
				content: 'Wildebeest Login page',
			},
		],
	}
}
