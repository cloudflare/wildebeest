import { emailSymbol } from 'wildebeest/backend/src/activitypub/actors'
import { Database } from 'wildebeest/backend/src/database'
import { getAdmins } from 'wildebeest/functions/api/wb/settings/server/admins'
import { getJwtEmail } from './getJwtEmail'

export async function isUserAdmin(jwtCookie: string, database: Database): Promise<boolean> {
	let email: string
	try {
		email = getJwtEmail(jwtCookie)
	} catch {
		return false
	}

	const admins = await getAdmins(database)

	return admins.some((admin) => admin[emailSymbol] === email)
}
