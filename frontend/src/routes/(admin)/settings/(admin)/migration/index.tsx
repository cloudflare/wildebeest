import { component$ } from '@builder.io/qwik'

export default component$(() => {
	return (
		<div class="max-w-4xl py-14 px-8">
			<h2 class="text-2xl font-bold mb-10">Account Migration</h2>

			{/*
			<div class="text-green-700 mb-10">Your account is not currently being redirected to any other account.</div>

			<h3 class="text-xl mb-6">Move to a different account</h3>

			<p class="text-sm text-wildebeest-400 mb-5">Before proceeding, please read these notes carefully:</p>

			<ul class="list-disc list-inside text-sm text-yellow-500 mb-5">
				<li class="pb-1">This action will move all followers from the current account to the new account</li>
				<li class="pb-1">
					Your current account's profile will be updated with a redirect notice and be excluded from searches
				</li>
				<li class="pb-1">No other data will be moved automatically</li>
				<li class="pb-1">The new account must first be configured to back-reference this one</li>
				<li class="pb-1">After moving there is a waiting period during which you will not be able to move again</li>
				<li class="pb-1">
					Your current account will not be fully usable afterwards. However, you will have access to data export as well
					as re-activation.
				</li>
			</ul>

			<p class="text-sm text-wildebeest-400 mb-10">
				Alternatively, you can <a href="/settings/aliases">only put up a redirect on your profile. </a>
			</p>

			<div class="flex">
				<div class="pr-3">
					<div class="my-5">
						<label class="font-semibold mb-3" for="old-account">
							Handle of the new account
							<span class="ml-1 text-red-500">*</span>
						</label>
						<div class="text-sm text-wildebeest-400">
							Specify the username@domain of the account you want to move to
						</div>
					</div>
					<input
						class="bg-black text-white p-3 rounded outline-none border border-black hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500 w-full mb-5"
						type="text"
						name="old-account"
						id="old-account"
					/>
				</div>
				<div class="pl-3">
					<div class="my-5">
						<label class="font-semibold mb-3" for="password">
							Current Password
							<span class="ml-1 text-red-500">*</span>
						</label>
						<div class="text-sm text-wildebeest-400">
							For security purposes please enter the password of the current account
						</div>
					</div>
					<input
						class="bg-black text-white p-3 rounded outline-none border border-red-500 hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500 w-full mb-5"
						type="password"
						name="password"
						id="password"
					/>
				</div>
			</div>

			<button
				type="submit"
				class="w-full mb-10 uppercase bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-2 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
			>
				Create Alias
			</button>

            */}
			<h3 class="text-xl mt-4 mb-8">Moving from a different account</h3>

			<p class="text-sm text-wildebeest-400 mb-5">
				To move from another account to this one, first you need to{' '}
				<a href="/settings/aliases">create an account alias</a>.
			</p>
		</div>
	)
})
