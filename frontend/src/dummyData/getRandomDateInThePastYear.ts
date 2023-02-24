export function getRandomDateInThePastYear(): Date {
	const nowDate = new Date()
	const pastDate = new Date(nowDate.getFullYear() - 1, nowDate.getMonth(), nowDate.getDate())

	const pastDateInMillis = pastDate.getTime()
	const nowDateInMillis = nowDate.getTime()
	const random = Math.random()

	const randomDateInMillis = pastDateInMillis + random * (nowDateInMillis - pastDateInMillis)
	return new Date(randomDateInMillis)
}
