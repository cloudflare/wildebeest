import { component$, Slot } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'
import * as access from 'wildebeest/backend/src/access'
import { WildebeestEnv } from '~/types'
import { checkAuth } from '~/utils/checkAuth'

type AccessLoaderData = {
	loginUrl: string
	isAuthorized: boolean
}

export const accessLoader = loader$<WildebeestEnv, Promise<AccessLoaderData>>(async ({ platform, request }) => {
	const isAuthorized = await checkAuth(request, platform)

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
