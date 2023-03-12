import { component$ } from '@builder.io/qwik'
import { action$, Form, zod$, z } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { updateSettings } from 'wildebeest/backend/src/config/server'
import { TextArea } from '~/components/Settings/TextArea'
import { TextInput } from '~/components/Settings/TextInput'
import { serverSettingsLoader } from '../layout'
import ResultMessage from '~/components/ResultMessage'
import { SubmitButton } from '~/components/Settings/SubmitButton'

const zodSchema = zod$({
	'server name': z.string().min(1),
	'server description': z.string().min(1),
})

export type ServerBrandingData = Awaited<typeof zodSchema>['_type']

export const action = action$(async (data, { platform }) => {
	const db = await getDatabase(platform)
	let success = false
	try {
		await updateSettings(db, data)
		success = true
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

	const showSuccessfulResult = !!saveAction.value?.success
	const showUnsuccessfulResult = !!saveAction.value && !saveAction.value.success

	return (
		<Form action={saveAction}>
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

			{showSuccessfulResult && <ResultMessage type="success" message="The changes have been saved successfully." />}

			{showUnsuccessfulResult && (
				<ResultMessage type="failure" message="There was an error and changes couldn't be saved." />
			)}

			<SubmitButton text="Save Changes" loading={saveAction.isRunning} />
		</Form>
	)
})
