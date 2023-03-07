import { component$ } from '@builder.io/qwik'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { getDomain } from 'wildebeest/backend/src/utils/getDomain'
import { getSettings } from 'wildebeest/backend/src/config/server'
import { getRules } from 'wildebeest/backend/src/config/rules'
import { Accordion } from '~/components/Accordion/Accordion'
import { HtmlContent } from '~/components/HtmlContent/HtmlContent'
import { Account } from '~/types'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { instanceLoader } from '../layout'
import { emailSymbol } from 'wildebeest/backend/src/activitypub/actors'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { AccountCard } from '~/components/AccountCard/AccountCard'
import { getAdmins } from 'wildebeest/backend/src/utils/auth/getAdmins'

type AboutInfo = {
	image: string
	domain: string
	admin: { account: Account | null; email: string }
	rules: { id: number; text: string }[]
	extended_description: {
		content: string
	}
}

export const aboutInfoLoader = loader$<Promise<AboutInfo>>(async ({ resolveValue, request, platform }) => {
	// TODO: fetching the instance for the thumbnail, but that should be part of the settings
	const instance = await resolveValue(instanceLoader)
	const database = await getDatabase(platform)
	const brandingData = await getSettings(database)
	const rules = await getRules(database)
	const admins = await getAdmins(database)
	let adminAccount: Account | null = null

	const adminPerson = admins.find((admin) => admin[emailSymbol] === platform.ADMIN_EMAIL)

	if (adminPerson) {
		try {
			adminAccount = (await loadLocalMastodonAccount(database, adminPerson)) as Account
		} catch {
			/* empty */
		}
	}

	return {
		image: instance.thumbnail,
		domain: getDomain(request.url),
		admin: { account: JSON.parse(JSON.stringify(adminAccount)), email: platform.ADMIN_EMAIL },
		rules: JSON.parse(JSON.stringify(rules.sort(({ id: idA }, { id: idB }) => idA - idB))),
		extended_description: {
			content: brandingData?.['extended description'] ?? '',
		},
	}
})

export default component$(() => {
	const aboutInfo = aboutInfoLoader().value

	return (
		<>
			<div class="bg-wildebeest-900 sticky top-[3.9rem] xl:top-0 xl:pt-2.5 z-10">
				<div class="flex flex-col items-center bg-wildebeest-600 xl:rounded-t overflow-hidden p-5">
					<img class="rounded w-full aspect-[1.9] mb-5" src={aboutInfo.image} alt="" />
					<h2 data-testid="domain-text" class="my-4 text-2xl font-semibold">
						{aboutInfo.domain}
					</h2>
					<p data-testid="social-text" class="mb-6 text-wildebeest-500">
						<span>
							Decentralized social network powered by{' '}
							<a
								href="https://github.com/cloudflare/wildebeest"
								class="no-underline text-wildebeest-200 font-semibold"
								target="_blank"
							>
								Wildebeest
							</a>
						</span>
					</p>

					<div
						class="rounded bg-wildebeest-700 flex flex-col md:flex-row p-2 w-full my-5 overflow-auto"
						data-testid="contact"
					>
						{!!aboutInfo.admin.account && (
							<div class="flex-1 p-4 border-wildebeest-500 border-solid border-b md:border-b-0 md:border-r">
								<span class="block uppercase text-wildebeest-500 font-semibold mb-5">Administered by:</span>
								<AccountCard account={aboutInfo.admin.account} subText="username" />
							</div>
						)}
						<div class="flex-1 p-4 pt-6 md:pt-4 md:pl-6 min-w-max">
							<span class="block uppercase text-wildebeest-500 font-semibold mb-5">Contact:</span>
							<span>{aboutInfo.admin.email}</span>
						</div>
					</div>

					<div class="flex flex-col w-full my-5">
						<div class="my-1">
							<Accordion title="About">
								<div class="p-6">
									<HtmlContent html={aboutInfo.extended_description.content} />
								</div>
							</Accordion>
						</div>
						<div class="my-1">
							<Accordion title="Server rules">
								<ol class="list-none flex flex-col gap-1 my-5 px-6">
									{aboutInfo.rules.map(({ id, text }, idx) => (
										<li key={id} class="flex items-center border-wildebeest-700 border-b last-of-type:border-b-0 py-2">
											<span class="bg-wildebeest-vibrant-400 text-wildebeest-900 mr-4 my-1 p-4 rounded-full w-5 h-5 grid place-content-center">
												{idx + 1}
											</span>
											<span>{text}</span>
										</li>
									))}
								</ol>
							</Accordion>
						</div>
					</div>
				</div>
			</div>
		</>
	)
})

export const head: DocumentHead = ({ resolveValue, head }) => {
	const instance = resolveValue(instanceLoader)

	return getDocumentHead(
		{
			title: `About - ${instance.title}`,
			description: `About page for ${instance.title}`,
			og: {
				type: 'website',
				image: instance.thumbnail,
			},
		},
		head
	)
}
