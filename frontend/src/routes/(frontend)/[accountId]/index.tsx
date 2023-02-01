import { component$ } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'
import { getNotFoundHtml } from '~/utils/getNotFoundHtml/getNotFoundHtml'

export const accountLoader = loader$(({ request, html }) => {
	const params = new URL(request.url).searchParams
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const accountId = params.get('accountId')

	html(404, getNotFoundHtml())

	// TODO: retrieve the account details from the backend
	const accountDetails = null

	return accountDetails
})

export default component$(() => {
	const accountDetails = accountLoader.use()

	// TODO: Implement the account view
	return <>{accountDetails.value && <div>account details</div>}</>
})
