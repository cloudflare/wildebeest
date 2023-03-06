import { component$, Slot } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'
import * as access from 'wildebeest/backend/src/access'
import { checkAuth } from '~/utils/checkAuth'

type AccessLoaderData = {
	loginUrl: string
	isAuthorized: boolean
}

export const accessLoader = loader$<Promise<AccessLoaderData>>(async ({ platform, request, cookie }) => {
	const jwt = cookie.get('CF_Authorization')?.value ?? ''
	const isAuthorized = await checkAuth(request, jwt, platform.ACCESS_AUTH_DOMAIN, platform.ACCESS_AUD)

	return {
		isAuthorized,
		loginUrl: access.generateLoginURL({
			redirectURL: request.url,
			domain: platform.ACCESS_AUTH_DOMAIN,
			aud: platform.ACCESS_AUD,
		}),
	}
})

export default component$(() => {
	return (
		<>
			<Slot />
		</>
	)
})
