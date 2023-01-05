import { component$, QRL } from '@builder.io/qwik'
import { configure, type InstanceConfig, testInstance } from './utils'

interface Props {
	instanceConfig: InstanceConfig
	setLoading: QRL<(loading: boolean) => void>
	setInstanceConfigured: QRL<(configured: boolean) => void>
}

export default component$<Props>(({ instanceConfig, setLoading, setInstanceConfigured }) => {
	return (
		<>
			<h2>Configure your instance</h2>

			<div class="flex flex-col mb-6 w-full max-w-md">
				<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-title">
					Title
				</label>
				<div class="flex justify-center items-center flex-wrap gap-1">
					<input
						id="start-instance-title"
						name="title"
						class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
						value={instanceConfig.title}
						onInput$={(ev) => (instanceConfig.title = (ev.target as HTMLInputElement).value)}
					/>
				</div>
			</div>

			<div class="flex flex-col mb-6 w-full max-w-md">
				<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-email">
					Administrator email
				</label>
				<div class="flex justify-center items-center flex-wrap gap-1">
					<input
						id="start-instance-email"
						name="email"
						type="email"
						class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
						value={instanceConfig.email}
						onInput$={(ev) => (instanceConfig.email = (ev.target as HTMLInputElement).value)}
					/>
				</div>
			</div>

			<div class="flex flex-col mb-6 w-full max-w-md">
				<label class="mb-2 max-w-max text-semi text-sm" for="start-instance-description">
					Description
				</label>
				<div class="flex justify-center items-center flex-wrap gap-1">
					<input
						id="start-instance-description"
						name="description"
						class="bg-black text-white p-3 rounded outline-none border border-black hover:border-indigo-400 focus:border-indigo-400 invalid:border-red-400 flex-1 w-full"
						value={instanceConfig.description}
						onInput$={(ev) => (instanceConfig.description = (ev.target as HTMLInputElement).value)}
					/>
				</div>
			</div>

			<button
				type="submit"
				class="mb-9 bg-indigo-600 hover:bg-indigo-500 p-3 text-white text-uppercase border-indigo-600 text-lg text-semi outline-none border rounded hover:border-indigo-500 focus:border-indigo-500"
				preventdefault:click
				onClick$={async () => {
					setLoading(true)
					await configure(instanceConfig)

					if (await testInstance()) {
						setInstanceConfigured(true)
					}

					setLoading(false)
				}}
			>
				Configure and start your instance
			</button>
		</>
	)
})
