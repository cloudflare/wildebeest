import { loader$ } from '@builder.io/qwik-city'
import { parse } from 'cookie'
import { isUserAuthenticated } from 'wildebeest/backend/src/utils/auth/isUserAuthenticated'
import { getErrorHtml } from './getErrorHtml/getErrorHtml'

export const authLoader = loader$(async ({ request, platform, html }) => {
	const cookie = parse(request.headers.get('Cookie') || '')
	const jwtCookie = cookie.CF_Authorization ?? ''
	const isAuthenticated = await isUserAuthenticated(
		request,
		jwtCookie,
		platform.ACCESS_AUTH_DOMAIN,
		platform.ACCESS_AUD
	)

	if (!isAuthenticated) {
		return html(401, getErrorHtml("You're not authorized to view this page"))
	}
})
