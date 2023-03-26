import { component$ } from '@builder.io/qwik'
import { getDatabase } from 'wildebeest/backend/src/database'
import { MastodonStatus, StatusContext } from '~/types'
import Status from '~/components/Status'
import * as statusAPI from 'wildebeest/functions/api/v1/statuses/[id]'
import * as contextAPI from 'wildebeest/functions/api/v1/statuses/[id]/context'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { getNotFoundHtml } from '~/utils/getNotFoundHtml/getNotFoundHtml'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import { getTextContent } from 'wildebeest/backend/src/activitypub/objects'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { Person } from 'wildebeest/backend/src/activitypub/actors'

export const statusLoader = loader$<
	Promise<{ status: MastodonStatus; statusTextContent: string; context: StatusContext }>
>(async ({ request, html, platform, params }) => {
	const domain = new URL(request.url).hostname
	let statusText = ''
	try {
		const statusResponse = await statusAPI.handleRequestGet(
			await getDatabase(platform),
			params.statusId,
			domain,
			{} as Person
		)
		statusText = await statusResponse.text()
	} catch (e: unknown) {
		const error = e as { stack: string; cause: string }
		console.warn(error.stack, error.cause)
		throw html(500, getErrorHtml('An error occurred whilst retrieving the status data, please try again later'))
	}
	if (!statusText) {
		throw html(404, getNotFoundHtml())
	}
	const status: MastodonStatus = JSON.parse(statusText)
	const statusTextContent = await getTextContent(status.content)

	try {
		const contextResponse = await contextAPI.handleRequest(domain, await getDatabase(platform), params.statusId)
		const contextText = await contextResponse.text()
		const context = JSON.parse(contextText ?? null) as StatusContext | null
		if (!context) {
			throw new Error(`No context present for status with ${params.statusId}`)
		}
		return { status, statusTextContent, context }
	} catch (e: unknown) {
		const error = e as { stack: string; cause: string }
		console.warn(error.stack, error.cause)
		throw html(500, getErrorHtml('No context for the status has been found, please try again later'))
	}
})

export default component$(() => {
	const loaderData = statusLoader().value

	return (
		<>
			<Status status={loaderData.status} accountSubText="acct" showInfoTray={true} contentClickable={false} />
			<div>
				{loaderData.context.descendants.map((status) => {
					return <Status status={status} accountSubText="username" showInfoTray={false} contentClickable={true} />
				})}
			</div>
		</>
	)
})

export const head: DocumentHead = ({ resolveValue }) => {
	const { status, statusTextContent } = resolveValue(statusLoader)

	const title = `${status.account.display_name}: ${statusTextContent.substring(0, 30)}${
		statusTextContent.length > 30 ? '…' : ''
	} - Wildebeest`

	return getDocumentHead({
		title,
		description: statusTextContent,
		og: {
			type: 'article',
			url: status.url,
			image: status.account.avatar,
		},
	})
}
