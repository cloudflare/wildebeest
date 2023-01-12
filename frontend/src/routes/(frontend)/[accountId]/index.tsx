import { component$ } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'

export const accountLoader = loader$(({ redirect, request }) => {
	const params = new URL(request.url).searchParams
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const accountId = params.get('accountId')

	redirect(303, '/not-found')

	// TODO: retrieve the account details from the backend
	const accountDetails = null

	return accountDetails
})

export default component$(() => {
	const accountDetails = accountLoader.use()

	// TODO: Implement the account view
	return <>{accountDetails.value && <div>account details</div>}</>
})
