import { component$ } from '@builder.io/qwik'
import { action$, Form, loader$, useNavigate, z, zod$ } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { getRules, upsertRule } from 'wildebeest/backend/src/config/rules'
import { TextArea } from '~/components/Settings/TextArea'
import { getErrorHtml } from '~/utils/getErrorHtml/getErrorHtml'
import { SubmitButton } from '~/components/Settings/SubmitButton'

export type ServerSettingsData = { rules: string[] }

export const editAction = action$(
	async (data, { platform }) => {
		let success = false
		try {
			const result = await upsertRule(await getDatabase(platform), {
				id: +data.id,
				text: data.text,
			})
			success = result.success
		} catch (e: unknown) {
			success = false
		}

		return {
			success,
		}
	},
	zod$({
		id: z.string().min(1),
		text: z.string().min(1),
	})
)

export const ruleLoader = loader$<Promise<{ id: number; text: string }>>(async ({ params, platform, html }) => {
	const database = await getDatabase(platform)
	const rules = await getRules(database)

	const rule: { id: string; text: string } | undefined = rules.find((r) => r.id === params['id'])

	if (!rule) {
		throw html(404, getErrorHtml('The selected rule could not be found'))
	}

	return JSON.parse(JSON.stringify(rule))
})

export default component$(() => {
	const rule = ruleLoader()
	const editActionObj = editAction()

	const nav = useNavigate()

	if (editActionObj.value?.success) {
		nav('/settings/server-settings/rules')
	}

	return (
		<>
			<Form action={editActionObj}>
				<p class="mt-12 mb-9">
					While most claim to have read and agree to the terms of service, usually people do not read through until
					after a problem arises. Make it easier to see your server's rules at a glance by providing them in a flat
					bullet point list. Try to keep individual rules short and simple, but try not to split them up into many
					separate items either.
				</p>

				<input hidden name="id" value={rule.value.id} />

				<div class="mb-12">
					<TextArea
						class="mb-1"
						label="Rule"
						required
						name="text"
						value={rule.value.text}
						description="Describe a rule or requirement for users on this server. Try to keep it short and simple."
					/>
				</div>

				<SubmitButton text="Save Changes" loading={editActionObj.isRunning} />
			</Form>
		</>
	)
})
