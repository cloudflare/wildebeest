import { $, component$, useStyles$ } from '@builder.io/qwik'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { MastodonAccount } from 'wildebeest/backend/src/types'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { formatDateTime } from '~/utils/dateTime'
import { formatRoundedNumber } from '~/utils/numbers'
import styles from '../../../utils/innerHtmlContent.scss?inline'
import { getAccount } from 'wildebeest/backend/src/accounts/getAccount'
import { getNotFoundHtml } from '~/utils/getNotFoundHtml/getNotFoundHtml'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import { getDocumentHead } from '~/utils/getDocumentHead'
import type { MastodonStatus } from '~/types'
import { StatusesPanel } from '~/components/StatusesPanel/StatusesPanel'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { getLocalStatuses } from 'wildebeest/functions/api/v1/accounts/[id]/statuses'

export const accountLoader = loader$<
	{ DATABASE: D1Database },
	Promise<{ account: MastodonAccount; accountHandle: string; statuses: MastodonStatus[] }>
>(async ({ platform, request, html }) => {
	let account: MastodonAccount | null = null
	let statuses: MastodonStatus[] = []
	try {
		const url = new URL(request.url)
		const domain = url.hostname
		const accountId = url.pathname.split('/')[1]

		account = await getAccount(domain, accountId, platform.DATABASE)

		const handle = parseHandle(accountId)
		const response = await getLocalStatuses(request as Request, platform.DATABASE, handle)
		statuses = await response.json<Array<MastodonStatus>>()
	} catch {
		throw html(
			500,
			getErrorHtml(`An error happened when trying to retrieve the account's details, please try again later`)
		)
	}

	if (!account) {
		throw html(404, getNotFoundHtml())
	}

	const accountDomain = getAccountDomain(account)

	const accountHandle = `@${account.acct}${accountDomain ? `@${accountDomain}` : ''}`

	return { account, accountHandle, statuses: JSON.parse(JSON.stringify(statuses)) }
})

export default component$(() => {
	useStyles$(styles)

	const accountDetails = accountLoader.use().value

	const fields = [
		{
			name: 'Joined',
			value: formatDateTime(accountDetails.account.created_at, false),
		},
		...accountDetails.account.fields,
	]

	const stats = [
		{
			name: 'Posts',
			value: formatRoundedNumber(accountDetails.account.statuses_count),
		},
		{
			name: 'Following',
			value: formatRoundedNumber(accountDetails.account.following_count),
		},
		{
			name: 'Followers',
			value: formatRoundedNumber(accountDetails.account.followers_count),
		},
	]

	return (
		<div>
			<StickyHeader withBackButton />
			<div data-testid="account-info">
				<div class="relative mb-16">
					<img
						src={accountDetails.account.header}
						alt={`Header of ${accountDetails.account.display_name}`}
						class="w-full h-40 object-cover bg-wildebeest-500"
					/>
					<img
						class="rounded h-24 w-24 absolute bottom-[-3rem] left-5 border-2 border-wildebeest-600"
						src={accountDetails.account.avatar}
						alt={`Avatar of ${accountDetails.account.display_name}`}
					/>
				</div>
				<div class="px-5">
					<h2 class="font-bold">{accountDetails.account.display_name}</h2>
					<span class="block my-1 text-wildebeest-400">{accountDetails.accountHandle}</span>
					<div class="inner-html-content my-5" dangerouslySetInnerHTML={accountDetails.account.note} />
					<dl class="mb-6 flex flex-col bg-wildebeest-800 border border-wildebeest-600 rounded-md">
						{fields.map(({ name, value }) => (
							<div class="border-b border-wildebeest-600 p-3 text-sm" key={name}>
								<dt class="uppercase font-semibold text-wildebeest-500 opacity-80 mb-1">{name}</dt>
								<dd class="inner-html-content opacity-80 text-wildebeest-200" dangerouslySetInnerHTML={value}></dd>
							</div>
						))}
					</dl>
					<div data-testid="stats" class="pb-4 flex flex-wrap gap-5">
						{stats.map(({ name, value }) => (
							<div class="flex gap-1" key={name}>
								<span class="font-semibold">{value}</span>
								<span class="text-wildebeest-500">{name}</span>
							</div>
						))}
					</div>
				</div>
				<div class="bg-wildebeest-800 flex justify-around mt-6">
					<span class="my-3 text-wildebeest-200">
						<span>Posts</span>
					</span>
				</div>
			</div>
			<div data-testid="account-statuses">
				{accountDetails.statuses.length > 0 && (
					<StatusesPanel
						initialStatuses={accountDetails.statuses}
						fetchMoreStatuses={$(async () => {
							// TODO-DARIO: implement this function
							return []
						})}
					/>
				)}
			</div>
		</div>
	)
})

export function getAccountDomain(account: MastodonAccount): string | null {
	try {
		const url = new URL(account.url)
		return url.hostname || null
	} catch {
		return null
	}
}

export const head: DocumentHead = ({ getData }) => {
	const { account, accountHandle } = getData(accountLoader)

	return getDocumentHead({
		title: `${account.display_name} (${accountHandle}) - Wildebeest`,
		description: `${account.display_name} account page - Wildebeest`,
		og: {
			url: account.url,
			type: 'article',
			image: account.avatar,
		},
	})
}
