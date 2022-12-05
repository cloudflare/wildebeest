/**
 * A Pages middleware function that logs requests/responses to the console.
 */
export async function logger(context: EventContext<unknown, any, any>) {
	const { method, url } = context.request
	console.log(`-> ${method} ${url} `)
	const res = await context.next()
	if (context.data.connectedActor) {
		console.log(`<- ${res.status} (${context.data.connectedActor.id})`)
	} else {
		console.log(`<- ${res.status}`)
	}

	return res
}
