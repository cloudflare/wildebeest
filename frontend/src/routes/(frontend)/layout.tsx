import { component$, Slot, useContextProvider } from '@builder.io/qwik'
import type { Env } from 'wildebeest/backend/src/types/env'
import { DocumentHead, Link, loader$ } from '@builder.io/qwik-city'
import * as instance from 'wildebeest/functions/api/v1/instance'
import type { InstanceConfig } from 'wildebeest/backend/src/types/configs'
import LeftColumn from '~/components/layout/LeftColumn/LeftColumn'
import RightColumn from '~/components/layout/RightColumn/RightColumn'
import { WildebeestLogo } from '~/components/MastodonLogo'
import { getCommitHash } from '~/utils/getCommitHash'
import { InstanceConfigContext } from '~/utils/instanceConfig'
import { getDocumentHead } from '~/utils/getDocumentHead'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'

export const instanceLoader = loader$<Promise<InstanceConfig>>(async ({ platform, html }) => {
	const env = {
		INSTANCE_DESCR: platform.INSTANCE_DESCR,
		INSTANCE_TITLE: platform.INSTANCE_TITLE,
		ADMIN_EMAIL: platform.ADMIN_EMAIL,
	} as Env
	try {
		const response = await instance.handleRequest('', env)
		const results = await response.text()
		const json = JSON.parse(results) as InstanceConfig
		return json
	} catch (e: unknown) {
		const error = e as { stack: string; cause: string }
		console.warn(error.stack, error.cause)
		throw html(500, getErrorHtml('An error occurred whilst retrieving the instance details'))
	}
})

export default component$(() => {
	useContextProvider(InstanceConfigContext, instanceLoader().value)
	const commitHash = getCommitHash()

	return (
		<>
			<header class="h-[3.9rem] z-50 sticky top-0 bg-wildebeest-600 p-3 w-full border-b border-wildebeest-700 xl:hidden">
				<Link class="no-underline flex items-center w-max" aria-label="Wildebeest Home" href={'/'}>
					<WildebeestLogo size="small" />
				</Link>
			</header>
			<main class="flex-1 flex justify-center top-[3.9rem] max-w-screen">
				<div class="w-fit md:w-72 hidden xl:block mx-2.5">
					<div class="sticky top-2.5">
						<LeftColumn />
					</div>
				</div>
				<div class="w-0 xl:max-w-xl bg-wildebeest-600 xl:bg-transparent flex flex-col flex-1">
					<div class="bg-wildebeest-600 rounded flex flex-1 flex-col">
						<Slot />
					</div>
				</div>
				<div class="w-fit md:w-72 border-l xl:border-l-0 border-wildebeest-700 xl:mx-2.5 flex flex-col">
					<div class="xl:top-2.5 flex-1 flex flex-col">
						<RightColumn />
					</div>
				</div>
			</main>
			<footer class="flex justify-end p-2 bg-wildebeest-600 border-t border-wildebeest-700 xl:bg-transparent xl:mt-10 xl:mx-6">
				{commitHash && <p class="text-sm text-wildebeest-500">v.{commitHash}</p>}
			</footer>
		</>
	)
})

export const head: DocumentHead = ({ resolveValue, head }) => {
	const instance = resolveValue(instanceLoader)

	return getDocumentHead(
		{
			description: instance.short_description ?? instance.description,
			og: {
				type: 'website',
				url: instance.uri,
				image: instance.thumbnail,
			},
		},
		head
	)
}
