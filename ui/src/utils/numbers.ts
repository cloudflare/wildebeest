export const formatRoundedNumber = (n: number) => {
	const BILLION = 1_000_000_000
	const MILLION = 1_000_000
	const THOUSAND = 1_000

	const roundAndFormat = (divisor: number) => {
		return formatter.format(n / divisor)
	}
	const formatter = Intl.NumberFormat('en', { maximumSignificantDigits: 2 })

	if (n >= BILLION) {
		// very optimistic future proofing
		return `${roundAndFormat(BILLION)}B`
	}
	if (n >= MILLION) {
		return `${roundAndFormat(MILLION)}M`
	}
	if (n >= THOUSAND) {
		return `${roundAndFormat(THOUSAND)}K`
	}

	return formatter.format(n)
}
