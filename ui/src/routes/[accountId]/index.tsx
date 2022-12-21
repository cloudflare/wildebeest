import { component$ } from '@builder.io/qwik'
import { useLocation } from '@builder.io/qwik-city'

export default component$(() => {
	const location = useLocation()

	return <div>account details {location.params.accountId}</div>
})
