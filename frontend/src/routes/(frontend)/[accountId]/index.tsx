import { $, component$ } from '@builder.io/qwik'
import { getDatabase } from 'wildebeest/backend/src/database'
import { loader$ } from '@builder.io/qwik-city'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import type { MastodonStatus } from '~/types'
import { StatusesPanel } from '~/components/StatusesPanel/StatusesPanel'
import { getLocalStatuses } from 'wildebeest/functions/api/v1/accounts/[id]/statuses'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'

export const statusesLoader = loader$<
	Promise<{
		accountId: string
		statuses: MastodonStatus[]
	}>
>(async ({ platform, request, html }) => {
	let statuses: MastodonStatus[] = []
	let accountId = ''
	try {
		const url = new URL(request.url)
		accountId = url.pathname.split('/')[1]

		const handle = parseHandle(accountId)
		accountId = handle.localPart
		const response = await getLocalStatuses(request as Request, await getDatabase(platform), handle, 0, false)
		statuses = await response.json<Array<MastodonStatus>>()
	} catch {
		throw html(
			500,
			getErrorHtml(`An error happened when trying to retrieve the account's statuses, please try again later`)
		)
	}

	return { accountId, statuses: JSON.parse(JSON.stringify(statuses)) }
})

export default component$(() => {
	const { accountId, statuses } = statusesLoader().value

	return (
		<div data-testid="account-posts">
			<StatusesPanel
				initialStatuses={statuses}
				fetchMoreStatuses={$(async (numOfCurrentStatuses: number) => {
					let statuses: MastodonStatus[] = []
					try {
						const response = await fetch(`/api/v1/accounts/${accountId}/statuses?offset=${numOfCurrentStatuses}`)
						if (response.ok) {
							const results = await response.text()
							statuses = JSON.parse(results)
						}
					} catch {
						/* empty */
					}
					return statuses
				})}
			/>
		</div>
	)
})
