import { component$, Slot } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'

type AuthLoaderData = {
	loginUrl: URL
	isAuthorized: boolean
}

export const authLoader = loader$<Promise<AuthLoaderData>>(async ({ platform }) => {
	const isAuthorized = platform.data.connectedActor !== null
	// defined in migrations/0010_add_ui_client.sql
	const UI_CLIENT_ID = '924801be-d211-495d-8cac-e73503413af8'
	const params = new URLSearchParams({
		redirect_uri: '/',
		response_type: 'code',
		client_id: UI_CLIENT_ID,
		scope: 'all',
	})
	const loginUrl = new URL('/oauth/authorize?' + params, 'https://' + platform.DOMAIN)

	return {
		isAuthorized,
		loginUrl,
	}
})

export default component$(() => {
	return (
		<>
			<Slot />
		</>
	)
})
