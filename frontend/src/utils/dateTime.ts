// Yes, this is horribly wrong, and with time will be fixed.
// I had trouble finding a low-footprint library that would format
// things in the very succinct format that Mastodon uses, so this
// close approximation will do the trick for now
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 4 * WEEK
const YEAR = 12 * MONTH

export const formatTimeAgo = (date: Date) => {
	const now = new Date()
	const timeAgo = Math.abs(date.getTime() - now.getTime())

	const roundTo = (duration: number) => {
		return Math.round(timeAgo / duration)
	}

	if (timeAgo < MINUTE) {
		return `${roundTo(SECOND)}s`
	}
	if (timeAgo < HOUR) {
		return `${roundTo(MINUTE)}m`
	}
	if (timeAgo < DAY) {
		return `${roundTo(HOUR)}h`
	}
	if (timeAgo < WEEK) {
		return `${roundTo(DAY)}d`
	}
	if (timeAgo < MONTH) {
		return `${roundTo(WEEK)}w`
	}
	if (timeAgo < YEAR) {
		return `${roundTo(MONTH)}mo`
	}

	return `${roundTo(YEAR)}y`
}

export const formatDateTime = (isoString: string, includeTime = true) => {
	const date = new Date(isoString)
	const dateFormatter = Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
	const timeFormatter = Intl.DateTimeFormat('en', { timeStyle: 'short' })
	return [dateFormatter.format(date), ...(includeTime ? [timeFormatter.format(date)] : [])].join(', ')
}
