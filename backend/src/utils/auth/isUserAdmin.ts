import { emailSymbol } from 'wildebeest/backend/src/activitypub/actors'
import { Database } from 'wildebeest/backend/src/database'
import { getJwtEmail } from 'wildebeest/backend/src/utils/auth/getJwtEmail'
import { getAdmins } from './getAdmins'
import { isUserAuthenticated } from './isUserAuthenticated'

export async function isUserAdmin(
	request: Request,
	jwt: string,
	accessAuthDomain: string,
	accessAud: string,
	database: Database
): Promise<boolean> {
	let email: string

	try {
		const authenticated = await isUserAuthenticated(request, jwt, accessAuthDomain, accessAud)
		if (!authenticated) {
			return false
		}

		email = getJwtEmail(jwt)
	} catch {
		return false
	}

	const admins = await getAdmins(database)

	return admins.some((admin) => admin[emailSymbol] === email)
}
