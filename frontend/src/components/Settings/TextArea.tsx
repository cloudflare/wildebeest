import { component$, useSignal } from '@builder.io/qwik'

type Props = {
	label: string
	name?: string
	description?: string
	class?: string
	invalid?: boolean
	value?: string
	required?: boolean
}

export const TextArea = component$<Props>(
	({ class: className, label, name, description, invalid, value, required }) => {
		const inputId = useSignal(`${label.replace(/\s+/g, '_')}___${crypto.randomUUID()}`).value
		return (
			<div class={`mb-6 ${className || ''}`}>
				<label class="font-semibold block mb-1" for={inputId}>
					{label}
					{!!required && <span class="ml-1 text-red-500">*</span>}
				</label>
				{!!description && <div class="text-sm inline-block mb-2 text-wildebeest-400">{description}</div>}
				<textarea
					class={`bg-black text-white p-3 rounded outline-none border hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500 w-full ${
						invalid ? 'border-red-500' : 'border-black'
					}`}
					id={inputId}
					name={name}
					value={value}
				/>
			</div>
		)
	}
)
