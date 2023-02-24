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

export const TextInput = component$<Props>(
	({ class: className, label, name, description, invalid, value, required }) => {
		const inputId = useSignal(`${label.replace(/\s+/g, '_')}___${crypto.randomUUID()}`).value
		const includeDefaultMb = !/(^|\s)m[y,b]?-\S+(\s|$)/.test(className || '')
		return (
			<div class={`${className || ''} ${includeDefaultMb ? 'mb-6' : ''}`}>
				<label class="font-semibold block mb-2" for={inputId}>
					{label}
					{!!required && <span class="ml-1 text-red-500">*</span>}
				</label>
				<input
					class={`bg-black text-white p-3 mb-1 rounded outline-none border hover:border-wildebeest-vibrant-500 focus:border-wildebeest-vibrant-500 w-full ${
						invalid ? 'border-red-500' : 'border-black'
					}`}
					type="text"
					id={inputId}
					name={name}
					value={value}
				/>
				{!!description && <div class="text-sm text-wildebeest-400">{description}</div>}
			</div>
		)
	}
)
