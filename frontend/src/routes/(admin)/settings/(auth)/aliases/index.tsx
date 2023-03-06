import { component$, useStore, useSignal, $ } from '@builder.io/qwik'

export default component$(() => {
	const ref = useSignal<Element>()
	const state = useStore({ alias: '' })
	const toast = useSignal<'success' | 'failure' | null>(null)

	const handleInput = $((event: Event) => {
		state.alias = (event.target as HTMLInputElement).value
	})

	const handleSubmit = $(async () => {
		const res = await fetch('/api/wb/settings/account/alias', { method: 'POST', body: JSON.stringify(state) })
		if (res.status == 200) {
			toast.value = 'success'
		} else {
			toast.value = 'failure'
		}
	})

	return (
		<form ref={ref} class="login-form" preventdefault:submit onSubmit$={handleSubmit}>
			<div class="max-w-4xl py-14 px-8">
				<h2 class="text-2xl font-bold mb-6">Account Aliases</h2>

				{toast.value === 'success' && (
					<div class="bg-green-800 border-green-700 text-green-100 border mb-5 p-5 text-center rounded">
						Successfully created a new alias. You can now initiate the move from the old account.
					</div>
				)}

				{toast.value === 'failure' && (
					<div class="bg-red-800 border-red-700 text-red-100 border mb-5 p-5 text-center rounded">
						Failed to create alias.
					</div>
				)}

				<p class="text-sm text-wildebeest-400 mb-10">
					If you want to move from another account to this one, here you can create an alias, which is required before
					you can proceed with moving followers from the old account to this one. This action by itself is harmless and
					reversible. The account migration is initiated from the old account.
				</p>

				<div class="my-5">
					<label class="font-semibold mb-3" for="alias">
						Handle of the old account
						<span class="ml-1 text-red-500">*</span>
					</label>
					<div class="text-sm text-wildebeest-400">
						Specify the username@domain of the account you want to move from
					</div>
				</div>
				<input
					class="bg-black text-white p-3 rounded outline-none border border-black hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500 w-full mb-5"
					type="text"
					id="alias"
					name="alias"
					value={state.alias}
					onInput$={handleInput}
				/>
				<button
					type="submit"
					class="w-full uppercase mb-9 bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-2 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
				>
					Create Alias
				</button>

				{/* <table class="table-auto w-full">
					<thead class="border-gray-600 border-b-2">
						<th class="text-left py-2">Handle of the old account</th>
						<th></th>
					</thead>
					<tbody>
						<tr class="border-gray-600 border-t">
							<td class="py-2">test</td>
							<td class="py-2">
								<div class="text-wildebeest-400 hover:text-white cursor-pointer">
									<i class="fa fa-trash fa-fw fa-xs mr-1" />
									Unlink Alias
								</div>
							</td>
						</tr>
						<tr class="border-gray-600 border-t">
							<td class="py-2">test 2</td>
							<td class="py-2">
								<div class="text-wildebeest-400 hover:text-white cursor-pointer">
									<i class="fa fa-trash fa-fw fa-xs mr-1" />
									Unlink Alias
								</div>
							</td>
						</tr>
					</tbody>
				</table> */}
			</div>
		</form>
	)
})
