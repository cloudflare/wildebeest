import { component$ } from '@builder.io/qwik'
import { DocumentHead, loader$ } from '@builder.io/qwik-city'
import { getDomain } from 'wildebeest/backend/src/utils/getDomain'
import { Accordion } from '~/components/Accordion/Accordion'
import { AccountCard } from '~/components/AccountCard/AccountCard'
import { HtmlContent } from '~/components/HtmlContent/HtmlContent'
import { george } from '~/dummyData/accounts'
import { Account } from '~/types'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { instanceLoader } from '../layout'

type AboutInfo = {
	image: string
	domain: string
	contact: {
		account: Account
		email: string
	}
	rules: { id: string; text: string }[]
	extended_description: {
		updated_at: string
		content: string
	}
}

export const aboutInfoLoader = loader$<Promise<AboutInfo>>(async ({ resolveValue, request, redirect }) => {
	// TODO: properly implement loader and remove redirect
	throw redirect(302, '/')

	const instance = await resolveValue(instanceLoader)
	return {
		image: instance.thumbnail,
		domain: getDomain(request.url),
		contact: {
			account: george,
			email: 'test@test.com',
		},
		rules: [
			{
				id: '1',
				text: 'Sexually explicit or violent media must be marked as sensitive when posting',
			},
			{
				id: '2',
				text: 'No racism, sexism, homophobia, transphobia, xenophobia, or casteism',
			},
			{
				id: '3',
				text: 'No incitement of violence or promotion of violent ideologies',
			},
			{
				id: '4',
				text: 'No harassment, dogpiling or doxxing of other users',
			},
			{
				id: '7',
				text: 'Do not share intentionally false or misleading information',
			},
		],
		extended_description: {
			updated_at: '2023-01-19T14:55:44Z',
			content:
				'<p>Please mind that the <a href="mailto:staff@mastodon.social">staff@mastodon.social</a> e-mail is for inquiries related to the operation of the mastodon.social server specifically. If your account is on another server, <strong>we will not be able to assist you</strong>. For inquiries not related specifically to the operation of this server, such as press inquiries about Mastodon gGmbH, please contact <a href="mailto:press@joinmastodon.org">press@joinmastodon.org</a>. Additional addresses:</p>\n\n<ul>\n<li>Legal, GDPR, DMCA: <a href="mailto:legal@mastodon.social">legal@mastodon.social</a></li>\n<li>Appeals: <a href="mailto:moderation@mastodon.social">moderation@mastodon.social</a></li>\n</ul>\n\n<h2>Funding</h2>\n\n<p>This server is crowdfunded by <a href="https://patreon.com/mastodon">Patreon donations</a>. For a list of sponsors, see <a href="https://joinmastodon.org/sponsors">joinmastodon.org</a>.</p>\n\n<h2>Reporting and moderation</h2>\n\n<p>When reporting accounts, please make sure to include at least a few posts that show rule-breaking behaviour, when applicable. If there is any additional context that might help make a decision, please also include it in the comment. This is especially important when the content is in a language nobody on the moderation team speaks.</p>\n\n<p>We usually handle reports within 24 hours. Please mind that you are not notified when a report you have made has led to a punitive action, and that not all punitive actions are externally visible. For first time offenses, we may opt to delete offending content, escalating to harsher measures on repeat offenses.</p>\n\n<p>We have a team of paid moderators. If you would like to become a moderator, get in touch with us through the e-mail address above.</p>\n\n<h2>Impressum</h2>\n\n<p>Mastodon gGmbH<br>\nMühlenstraße 8a<br>\n14167 Berlin<br>\nGermany</p>\n\n<p>E-Mail-Adresse: hello@joinmastodon.org</p>\n\n<p>Vertretungsberechtigt: Eugen Rochko (Geschäftsführer)</p>\n\n<p>Umsatzsteuer Identifikationsnummer (USt-ID): DE344258260</p>\n\n<p>Handelsregister<br>\nGeführt bei: Amtsgericht Charlottenburg<br>\nNummer: HRB 230086 B</p>\n',
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
							Decentralised social media powered by{' '}
							<a href="https://joinmastodon.org" class="no-underline text-wildebeest-200 font-semibold" target="_blank">
								Mastodon
							</a>
						</span>
					</p>

					<div class="rounded bg-wildebeest-700 flex flex-col md:flex-row p-2 w-full my-5" data-testid="contact">
						<div class="flex-1 p-4">
							<span class="block uppercase text-wildebeest-500 font-semibold mb-5">Administered by:</span>
							<AccountCard account={aboutInfo.contact.account} subText="username" />
						</div>
						<div class="flex-1 p-4 pt-6 md:pt-4 md:pl-6 border-wildebeest-500 border-solid border-t md:border-t-0 md:border-l">
							<span class="block uppercase text-wildebeest-500 font-semibold mb-5">Contact:</span>
							<span>{aboutInfo.contact.email}</span>
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
									{aboutInfo.rules.map(({ id, text }) => (
										<li key={id} class="flex items-center border-wildebeest-700 border-b last-of-type:border-b-0 py-2">
											<span class="bg-wildebeest-vibrant-400 text-wildebeest-900 mr-4 my-1 p-4 rounded-full w-5 h-5 grid place-content-center">
												{id}
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
			description: `About page for the ${instance.title} Mastodon instance`,
			og: {
				type: 'website',
				image: instance.thumbnail,
			},
		},
		head
	)
}
