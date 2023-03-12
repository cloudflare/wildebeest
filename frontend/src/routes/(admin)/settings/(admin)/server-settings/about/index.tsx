import { component$ } from '@builder.io/qwik'
import { action$, Form, Link, z, zod$ } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { updateSettings } from 'wildebeest/backend/src/config/server'
import { TextArea } from '~/components/Settings/TextArea'
import { serverSettingsLoader } from '../layout'
import { SubmitButton } from '~/components/Settings/SubmitButton'
import ResultMessage from '~/components/ResultMessage'

const zodSchema = zod$({
	'extended description': z.string().min(1),
	'privacy policy': z.string().optional(),
})

export type ServerAboutData = Awaited<typeof zodSchema>['_type']

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

			{showSuccessfulResult && <ResultMessage type="success" message="The changes have been saved successfully." />}

			{showUnsuccessfulResult && (
				<ResultMessage type="failure" message="There was an error and changes couldn't be saved." />
			)}

			<SubmitButton text="Save Changes" loading={saveAction.isRunning} />
		</Form>
	)
})
