import { component$ } from '@builder.io/qwik'
import { action$, Form, zod$, z } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { handleRequestPost } from 'wildebeest/functions/api/wb/settings/server/server'
import { TextArea } from '~/components/Settings/TextArea'
import { TextInput } from '~/components/Settings/TextInput'
import { serverSettingsLoader } from '../layout'

const zodSchema = zod$({
	'server name': z.string().min(1),
	'server description': z.string().min(1),
})

export type ServerBrandingData = Awaited<typeof zodSchema>['_type']

export const action = action$(async (data, { request, platform }) => {
	let success = false
	try {
		const response = await handleRequestPost(
			await getDatabase(platform),
			new Request(request, { body: JSON.stringify(data) })
		)
		success = response.ok
	} catch (e: unknown) {
		success = false
	}

	return {
		success,
	}
}, zodSchema)

export default component$(() => {
	const existingSettings = serverSettingsLoader()
	const saveAction = action()

	return (
		<Form action={saveAction} spaReset>
			<p class="mt-12 mb-9">
				Your server's branding differentiates it from other servers in the network. This information may be displayed
				across a variety of environments, such as Mastodon's web interface, native applications, in link previews on
				other websites and within messaging apps, and so on. For this reason, it is best to keep this information clear,
				short and concise.
			</p>

			<TextInput
				class="mb-9"
				label="Server name"
				name="server name"
				value={existingSettings.value['server name']}
				invalid={!!saveAction.value?.fieldErrors?.['server name']}
				description="How people may refer to your server besides its domain name."
			/>

			<TextArea
				label="Server description"
				name="server description"
				value={existingSettings.value['server description']}
				invalid={!!saveAction.value?.fieldErrors?.['server description']}
				description="A short description to help uniquely identify your server. Who is running it, who is it for?"
			/>

			<button
				type="submit"
				class="w-full my-10 bg-wildebeest-vibrant-600 hover:bg-wildebeest-vibrant-500 p-2 text-white text-uppercase border-wildebeest-vibrant-600 text-lg text-semi outline-none border rounded hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500"
			>
				Save Changes
			</button>
		</Form>
	)
})
