import { component$ } from '@builder.io/qwik'
import { TagDetails } from '~/types'
import { Sparkline } from '~/components/Sparkline'
import { formatHistory } from '~/utils/history'

type Props = {
	tagDetails: TagDetails
}

export default component$((props: Props) => {
	const history = props.tagDetails.history
	const data = [...history]
		.sort((r) => parseInt(r.day))
		.reverse()
		.map((r) => parseInt(r.uses))

	return (
		<div class="flex justify-between items-center">
			<div class="">
				<div class="text-sm text-bold text-wildebeest-400">#{props.tagDetails.name}</div>
				<div class="text-xs text-wildebeest-500">{formatHistory(history)}</div>
			</div>
			<Sparkline data={data} />
		</div>
	)
})
