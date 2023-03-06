import { component$ } from '@builder.io/qwik'
import { action$, Form, Link, z, zod$ } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { handleRequestPost } from 'wildebeest/functions/api/wb/settings/server/server'
import { TextArea } from '~/components/Settings/TextArea'
import { serverSettingsLoader } from '../layout'

const zodSchema = zod$({
	'extended description': z.string().min(1),
	'privacy policy': z.string().optional(),
})

export type ServerAboutData = Awaited<typeof zodSchema>['_type']

export const action = action$(async (data, { request, platform }) => {
	let success = false
	try {
		const response = await handleRequestPost(
			await getDatabase(platform),
			new Request(request, { body: JSON.stringify(data) }),
			platform.ACCESS_AUTH_DOMAIN,
			platform.ACCESS_AUD
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
			<p class="mt-12 mb-9">Provide in-depth information about how the server is operated, moderated, funded.</p>

			<div class="mb-12">
				<TextArea
					class="mb-1"
					label="Extended description"
					name="extended description"
					description="Any additional information that may be useful to visitors and your users. Can be structured with Markdown syntax."
					value={existingSettings.value['extended description']}
				/>
				<div class="text-sm text-wildebeest-400">
					There is a dedicated area for rules that your users are expected to adhere to{' '}
					<Link href="/settings/server-settings/rules">Manage server rules</Link>
				</div>
			</div>

			<TextArea
				label="Privacy Policy"
				description="Use your own privacy policy or leave blank to use the default. Can be structured with Markdown syntax."
				name="privacy policy"
				value={existingSettings.value['privacy policy']}
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
