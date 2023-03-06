import { emailSymbol } from 'wildebeest/backend/src/activitypub/actors'
import { Database } from 'wildebeest/backend/src/database'
import { getAdmins } from 'wildebeest/functions/api/wb/settings/server/admins'
import { checkAuth } from './checkAuth'
import { getJwtEmail } from './getJwtEmail'

export async function isUserAdmin(
	request: Request,
	jwt: string,
	accessAuthDomain: string,
	accessAud: string,
	database: Database
): Promise<boolean> {
	let email: string

	try {
		const authenticated = await checkAuth(request, jwt, accessAuthDomain, accessAud)
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
