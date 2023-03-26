import { component$ } from '@builder.io/qwik'
import { action$, Form, Link, loader$, z, zod$ } from '@builder.io/qwik-city'
import { getDatabase } from 'wildebeest/backend/src/database'
import { getRules, deleteRule, upsertRule } from 'wildebeest/backend/src/config/rules'
import { TextArea } from '~/components/Settings/TextArea'
import { SubmitButton } from '~/components/Settings/SubmitButton'

export type ServerSettingsData = { rules: string[] }

export const addAction = action$(
	async (data, { platform }) => {
		let success = false
		try {
			const result = await upsertRule(await getDatabase(platform), data.text)
			success = result.success
		} catch (e: unknown) {
			success = false
		}

		return {
			success,
		}
	},
	zod$({
		text: z.string().min(1),
	})
)

export const deleteAction = action$(
	async (data, { platform }) => {
		let success = false

		try {
			const result = await deleteRule(await getDatabase(platform), data.id)
			success = result.success
		} catch (e: unknown) {
			success = false
		}

		return {
			success,
		}
	},
	zod$({
		id: z.number(),
	})
)

export const rulesLoader = loader$<Promise<{ id: number; text: string }[]>>(async ({ platform }) => {
	const database = await getDatabase(platform)
	const rules = await getRules(database)
	return JSON.parse(JSON.stringify(rules))
})

export default component$(() => {
	const rules = rulesLoader()
	const addActionObj = addAction()
	const deleteActionObj = deleteAction()

	return (
		<>
			<Form action={addActionObj} spaReset>
				<p class="mt-12 mb-9">
					While most claim to have read and agree to the terms of service, usually people do not read through until
					after a problem arises. Make it easier to see your server's rules at a glance by providing them in a flat
					bullet point list. Try to keep individual rules short and simple, but try not to split them up into many
					separate items either.
				</p>

				<div class="mb-12">
					<TextArea
						class="mb-1"
						label="Rule"
						name="text"
						required
						description="Describe a rule or requirement for users on this server. Try to keep it short and simple."
					/>
				</div>

				<SubmitButton text="Add Rule" loading={addActionObj.isRunning} />
			</Form>
			<div>
				{rules.value.map(({ id, text }, idx) => {
					const ruleNumber = idx + 1
					const ruleBtnText = `${ruleNumber}. ${text.slice(0, 27)}${text.length > 27 ? '...' : ''}`
					return (
						<div key={id} class="p-4 my-4 bg-wildebeest-600 rounded">
							<Link href={`./edit/${id}`} class="max-w-max inline-block mb-4 no-underline text-lg font-semibold">
								{ruleBtnText}
							</Link>
							<div class="flex justify-between text-wildebeest-400">
								<span>{text}</span>
								<button
									onClick$={() => {
										if (confirm('Are you sure?')) {
											deleteActionObj.run({ id })
										}
									}}
								>
									<i class="fa-solid fa-trash"></i> Delete
								</button>
							</div>
						</div>
					)
				})}
			</div>
		</>
	)
})
