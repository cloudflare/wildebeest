/**
 * A Pages middleware function that logs errors to the console and responds with 500 errors and stack-traces.
 */
export async function errorHandling(context: EventContext<unknown, any, any>) {
	try {
		return await context.next()
	} catch (err: any) {
		return new Response(`${err.message}\n${err.stack}`, { status: 500 })
	}
}
