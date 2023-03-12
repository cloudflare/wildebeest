import { component$ } from '@builder.io/qwik'

type Props = {
	type: 'success' | 'failure'
	message: string
}

export default component$(({ type, message }: Props) => {
	const colorClasses = getColorClasses(type)
	return <p class={`border mb-5 p-5 text-center rounded ${colorClasses}`}>{message}</p>
})

export function getColorClasses(type: Props['type']): string {
	switch (type) {
		case 'success':
			return 'bg-green-800 border-green-700 text-green-100'
		case 'failure':
			return 'bg-red-800 border-red-700 text-red-100 text-green-100'
		default:
			return 'bg-green-800 border-green-700 text-green-100'
	}
}
