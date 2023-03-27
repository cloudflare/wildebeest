import { component$, Slot } from '@builder.io/qwik'
import { Link, loader$, useLocation } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { getSettings } from 'wildebeest/backend/src/config/server'
import { ServerAboutData } from './about'
import { ServerBrandingData } from './branding'

export { adminLoader } from '~/utils/adminLoader'

export type ServerSettingsData = ServerBrandingData & ServerAboutData

export const serverSettingsLoader = loader$<Promise<Partial<ServerSettingsData>>>(async ({ platform }) => {
	const database = await getDatabase(platform)

	const settings = await getSettings(database)

	return JSON.parse(JSON.stringify(settings))
})

export default component$(() => {
	const sectionLinks = [
		{
			text: 'Branding',
			faIcon: 'fa-pen',
			path: 'branding',
		},
		{
			text: 'About',
			faIcon: 'fa-file-lines',
			path: 'about',
		},
		{
			text: 'Rules',
			faIcon: 'fa-pen-ruler',
			path: 'rules',
		},
	] as const

	const currentPath = useLocation().url.pathname.replace(/\/$/, '')

	return (
		<div class="max-w-4xl py-14 px-8">
			<h2 class="text-2xl font-bold mb-6">Server Settings</h2>

			<ul class="flex gap-4 mb-6">
				{sectionLinks.map(({ text, faIcon, path }) => {
					const isActive = currentPath.endsWith(path)
					return (
						<Link
							key={text}
							class={`
						  		py-2 px-3 rounded text-sm no-underline flex gap-2
								${
									isActive
										? 'bg-wildebeest-vibrant-500 hover:bg-wildebeest-vibrant-400 focus-visible:bg-wildebeest-vibrant-400'
										: 'hover:bg-wildebeest-700 focus-visible:bg-wildebeest-700'
								}`}
							href={`/settings/server-settings/${path}`}
						>
							<i class={`fa-solid ${faIcon} leading-normal w-3 h-3`}></i>
							{text}
						</Link>
					)
				})}
			</ul>

			<Slot />
		</div>
	)
})
