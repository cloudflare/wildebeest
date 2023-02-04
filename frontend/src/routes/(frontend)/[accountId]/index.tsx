import { $, component$, useStyles$ } from '@builder.io/qwik'
import { loader$, useNavigate } from '@builder.io/qwik-city'
import { MastodonAccount } from 'wildebeest/backend/src/types'
import StickyHeader from '~/components/StickyHeader/StickyHeader'
import { formatDateTime } from '~/utils/dateTime'
import { getNotFoundHtml } from '~/utils/getNotFoundHtml/getNotFoundHtml'
import { formatRoundedNumber } from '~/utils/numbers'
import styles from '../../../utils/innerHtmlContent.scss?inline'
import { getAccount } from 'wildebeest/backend/src/accounts/getAccount'

export async function getAccountDetails(
	domain: string,
	db: D1Database,
	accountId: string
): Promise<MastodonAccount | null> {
	return await getAccount(domain, accountId, db)
}

export const accountLoader = loader$<{ DATABASE: D1Database }, Promise<MastodonAccount>>(
	async ({ platform, request, html }) => {
		const url = new URL(request.url)
		const domain = url.hostname
		const accountId = url.pathname.split('/')[1]

		const account = await getAccountDetails(domain, platform.DATABASE, accountId)

		if (!account) {
			throw html(404, getNotFoundHtml())
		}

		return account
	}
)

export default component$(() => {
	useStyles$(styles)
	const nav = useNavigate()

	const accountDetails = accountLoader.use().value

	const goBack = $(() => {
		if (window.history.length > 1) {
			window.history.back()
		} else {
			nav('/explore')
		}
	})

	const fields = [
		{
			name: 'Joined',
			value: formatDateTime(accountDetails.created_at, false),
		},
		...accountDetails.fields,
	]

	const stats = [
		{
			name: 'Posts',
			value: formatRoundedNumber(accountDetails.statuses_count),
		},
		{
			name: 'Following',
			value: formatRoundedNumber(accountDetails.following_count),
		},
		{
			name: 'Followers',
			value: formatRoundedNumber(accountDetails.followers_count),
		},
	]

	const accountDomain = getAccountDomain(accountDetails)

	return (
		<div>
			<StickyHeader>
				<div class="flex justify-between items-center xl:rounded-t header bg-wildebeest-700">
					<button class="text-semi no-underline text-wildebeest-vibrant-400 bg-transparent p-4" onClick$={goBack}>
						<i class="fa fa-chevron-left mr-2 w-3 inline-block" />
						<span class="hover:underline">Back</span>
					</button>
				</div>
			</StickyHeader>
			<div class="relative mb-16">
				<img
					src={accountDetails.header}
					alt={`Header of ${accountDetails.display_name}`}
					class="w-full h-40 object-cover bg-wildebeest-500"
				/>
				<img
					class="rounded h-24 w-24 absolute bottom-[-3rem] left-5 border-2 border-wildebeest-600"
					src={accountDetails.avatar}
					alt={`Avatar of ${accountDetails.display_name}`}
				/>
			</div>
			<div class="px-5">
				<h2 class="font-bold">{accountDetails.display_name}</h2>
				<span class="block my-1 text-wildebeest-400">
					@{accountDetails.acct}
					{accountDomain && `@${accountDomain}`}
				</span>
				<div class="inner-html-content my-5" dangerouslySetInnerHTML={accountDetails.note} />
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
