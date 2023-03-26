import { loader$ } from '@builder.io/qwik-city'
import { getErrorHtml } from './getErrorHtml/getErrorHtml'

export const authLoader = loader$(async ({ platform, html }) => {
	const isAuthenticated = platform.data.connectedActor !== null

	if (!isAuthenticated) {
		return html(401, getErrorHtml("You're not authorized to view this page"))
	}
})
