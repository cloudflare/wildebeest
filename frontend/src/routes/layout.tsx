import { component$, Slot } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'
import { isUserAuthenticated } from 'wildebeest/backend/src/utils/auth/isUserAuthenticated'

type AuthLoaderData = {
	loginUrl: URL
	isAuthorized: boolean
}

export const authLoader = loader$<Promise<AuthLoaderData>>(async ({ platform, request, cookie }) => {
	const jwt = cookie.get('CF_Authorization')?.value ?? ''
	const isAuthorized = await isUserAuthenticated(request, jwt, platform.ACCESS_AUTH_DOMAIN, platform.ACCESS_AUD)
	// FIXME(sven): remove hardcoded value
	const UI_CLIENT_ID = '924801be-d211-495d-8cac-e73503413af8'
	const params = new URLSearchParams({
		redirect_uri: request.url,
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
