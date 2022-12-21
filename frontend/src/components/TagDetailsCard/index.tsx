import { component$ } from '@builder.io/qwik'
import { TagDetails } from '~/types'
import { Sparkline } from '~/components/Sparkline'
import { formatRoundedNumber } from '~/utils/numbers'

type Props = {
	tagDetails: TagDetails
}

export default component$((props: Props) => {
	const secondsToDays = (ms: number) => Math.round(ms / 60 / 60 / 24)

	const history = props.tagDetails.history
	const data = [...history]
		.sort((r) => parseInt(r.day))
		.reverse()
		.map((r) => parseInt(r.uses))

	const totalUsers = history.reduce((acc, val) => acc + parseInt(val.accounts), 0)

	const dates = history.map((r) => parseInt(r.day))
	const maxDay = dates.reduce((acc, val) => Math.max(acc, val), 0)
	const minDay = dates.reduce((acc, val) => Math.min(acc, val), maxDay)
	const range = maxDay - minDay
	const formatter = new Intl.RelativeTimeFormat('end')
	const formattedRange = formatter.format(secondsToDays(range), 'days')

	return (
		<div class="flex justify-between items-center">
			<div class="">
				<div class="text-sm text-bold text-slate-400">#{props.tagDetails.name}</div>
				<div class="text-xs text-slate-500">
					<span class="text-bold">{formatRoundedNumber(totalUsers)} </span>
					people in the past {formattedRange} days
				</div>
			</div>
			<Sparkline data={data} />
		</div>
	)
})
