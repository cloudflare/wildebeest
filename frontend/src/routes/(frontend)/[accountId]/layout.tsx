import { component$, Slot, useStyles$ } from '@builder.io/qwik'
import { type DocumentHead, loader$ } from '@builder.io/qwik-city'
import { MastodonAccount } from 'wildebeest/backend/src/types'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { formatDateTime } from '~/utils/dateTime'
import { formatRoundedNumber } from '~/utils/numbers'
import styles from '../../../utils/innerHtmlContent.scss?inline'
import { getAccount } from 'wildebeest/backend/src/accounts/getAccount'
import { getNotFoundHtml } from '~/utils/getNotFoundHtml/getNotFoundHtml'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import { getDocumentHead } from '~/utils/getDocumentHead'
import * as statusAPI from 'wildebeest/functions/api/v1/statuses/[id]'

export const accountPageLoader = loader$<
	{ DATABASE: D1Database },
	Promise<{ account: MastodonAccount; accountHandle: string; isValidStatus: boolean }>
>(async ({ platform, params, request, html }) => {
	let isValidStatus = false
	let account: MastodonAccount | null = null
	try {
		const url = new URL(request.url)
		const domain = url.hostname
		const accountId = url.pathname.split('/')[1]

		try {
			const statusResponse = await statusAPI.handleRequestGet(platform.DATABASE, params.statusId, domain)
			const statusText = await statusResponse.text()
			isValidStatus = !!statusText
		} catch {
			isValidStatus = false
		}

		account = await getAccount(domain, accountId, platform.DATABASE)
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

	return { account, accountHandle, isValidStatus }
})

export default component$(() => {
	useStyles$(styles)

	const pageDetails = accountPageLoader.use().value
	const showAccountInfo = !pageDetails.isValidStatus

	const fields = [
		{
			name: 'Joined',
			value: formatDateTime(pageDetails.account.created_at, false),
		},
		...pageDetails.account.fields,
	]

	const stats = [
		{
			name: 'Posts',
			value: formatRoundedNumber(pageDetails.account.statuses_count),
		},
		{
			name: 'Following',
			value: formatRoundedNumber(pageDetails.account.following_count),
		},
		{
			name: 'Followers',
			value: formatRoundedNumber(pageDetails.account.followers_count),
		},
	]

	return (
		<div>
			<StickyHeader withBackButton />
			{showAccountInfo && (
				<>
					<div data-testid="account-info">
						<div class="relative mb-16">
							<img
								src={pageDetails.account.header}
								alt={`Header of ${pageDetails.account.display_name}`}
								class="w-full h-40 object-cover bg-wildebeest-500"
							/>
							<img
								class="rounded h-24 w-24 absolute bottom-[-3rem] left-5 border-2 border-wildebeest-600"
								src={pageDetails.account.avatar}
								alt={`Avatar of ${pageDetails.account.display_name}`}
							/>
						</div>
						<div class="px-5">
							<h2 class="font-bold">{pageDetails.account.display_name}</h2>
							<span class="block my-1 text-wildebeest-400">{pageDetails.accountHandle}</span>
							<div class="inner-html-content my-5" dangerouslySetInnerHTML={pageDetails.account.note} />
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
					</div>
					<div class="bg-wildebeest-800 flex justify-around mt-6">
						<span class="my-3 text-wildebeest-200">
							<span>Posts</span>
						</span>
					</div>
				</>
			)}
			<Slot />
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

export const head: DocumentHead = ({ getData, head }) => {
	const { account, accountHandle } = getData(accountPageLoader)

	return getDocumentHead(
		{
			title: `${account.display_name} (${accountHandle}) - Wildebeest`,
			description: `${account.display_name} account page - Wildebeest`,
			og: {
				url: account.url,
				type: 'article',
				image: account.avatar,
			},
		},
		head
	)
}
