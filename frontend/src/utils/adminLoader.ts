import { loader$ } from '@builder.io/qwik-city'
import { parse } from 'cookie'
import { getDatabase } from 'wildebeest/backend/src/database'
import { isUserAdmin } from 'wildebeest/backend/src/utils/auth/isUserAdmin'
import { getErrorHtml } from './getErrorHtml/getErrorHtml'

export const adminLoader = loader$(async ({ request, platform, html }) => {
	const database = await getDatabase(platform)
	const cookie = parse(request.headers.get('Cookie') || '')
	const jwtCookie = cookie.CF_Authorization ?? ''
	const isAdmin = await isUserAdmin(request, jwtCookie, platform.ACCESS_AUTH_DOMAIN, platform.ACCESS_AUD, database)

	if (!isAdmin) {
		return html(401, getErrorHtml('You need to be an admin to view this page'))
	}
})
