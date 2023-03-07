import { loader$ } from '@builder.io/qwik-city'
import { isAdminSymbol } from 'wildebeest/backend/src/activitypub/actors'
import { getErrorHtml } from './getErrorHtml/getErrorHtml'

export const adminLoader = loader$(async ({ platform, html }) => {
	const isAuthorized = platform.data.connectedActor !== null
	const isAdmin = isAuthorized && platform.data.connectedActor[isAdminSymbol]

	if (!isAdmin) {
		return html(401, getErrorHtml('You need to be an admin to view this page'))
	}
})
