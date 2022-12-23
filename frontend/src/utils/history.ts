import { History } from '~/types'
import { formatRoundedNumber } from './numbers'

export const formatHistory = (history: History[]) => {
	const secondsToDays = (ms: number) => Math.round(ms / 60 / 60 / 24)

	const totalUsers = history.reduce((acc, val) => acc + parseInt(val.accounts), 0)
	const dates = history.map((r) => parseInt(r.day))
	const maxDay = dates.reduce((acc, val) => Math.max(acc, val), 0)
	const minDay = dates.reduce((acc, val) => Math.min(acc, val), maxDay)
	const range = maxDay - minDay
	const formatter = new Intl.RelativeTimeFormat('end')
	const formattedRange = formatter.format(secondsToDays(range), 'days')

	return `${formatRoundedNumber(totalUsers)} people in the past ${formattedRange}`
}
