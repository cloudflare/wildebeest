// https://docs.joinmastodon.org/entities/Instance/
// https://docs.joinmastodon.org/methods/instance/
import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import * as error from 'wildebeest/backend/src/errors'
import { DEFAULT_THUMBNAIL } from 'wildebeest/backend/src/config'
import { getVersion } from 'wildebeest/config/versions'
import { calculateInstanceStatistics } from 'wildebeest/backend/src/mastodon/instance'
import { MastodonInstance } from 'wildebeest/backend/src/types/instance'
import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { Database, getDatabase } from 'wildebeest/backend/src/database'
import { getAdmins } from 'wildebeest/backend/src/utils/auth/getAdmins'
import { getRules } from 'wildebeest/backend/src/config/rules'
import { emailSymbol } from 'wildebeest/backend/src/activitypub/actors'

export const onRequest: PagesFunction<Env, any> = async ({ env, request }) => {
	const domain: string = new URL(request.url).hostname
	const db: Database = await getDatabase(env)
	return handleRequest(domain, env, db)
}

export async function handleRequest(domain: string, env: Env, db: Database) {
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}

	if (env.ADMIN_EMAIL === 'george@test.email') {
		db = await getDatabase(env)
	}

	if (db === undefined) {
		const message: string = 'Server misconfiguration: missing database binding'
		console.error(message)
		return error.internalServerError()
	} else if (domain !== env.DOMAIN) {
		const message: string = `Invalid request: 'domain' (${domain}) !== 'env.DOMAIN' (${env.DOMAIN})`
		console.trace(message)
		return error.validationError(message)
	}

	const statsDomain: string = env.ADMIN_EMAIL === 'george@test.email' ? '0.0.0.0' : domain

	const res: MastodonInstance = {
		uri: domain,
		title: env.INSTANCE_TITLE,
		description: env.INSTANCE_DESCR,
		short_description: env.INSTANCE_DESCR,
		email: env.ADMIN_EMAIL,
		version: getVersion(),
		languages: ['en'],
		registrations: false,
		approval_required: false,
		invites_enabled: false,
		thumbnail: DEFAULT_THUMBNAIL,
		stats: await calculateInstanceStatistics(statsDomain, db),
		configuration: {
			statuses: {
				max_characters: 500,
				max_media_attachments: 4,
				characters_reserved_per_url: 23,
			},
			media_attachments: {
				supported_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
				image_size_limit: 10485760,
				image_matrix_limit: 16777216,
				video_size_limit: 41943040,
				video_frame_rate_limit: 60,
				video_matrix_limit: 2304000,
			},
			polls: {
				max_options: 0,
				max_characters_per_option: 1,
				min_expiration: 1,
				max_expiration: 1,
			},
		},
		rules: await getRules(db),
	}
	let adminAccount: MastodonAccount | undefined

	try {
		const adminActors = await getAdmins(db)
		const adminPerson = adminActors.find((admin) => admin[emailSymbol] === env.ADMIN_EMAIL)

		if (!adminPerson) {
			adminAccount = undefined
			console.warn('Server misconfiguration: no admin account was found')
		} else {
			adminAccount = (await loadLocalMastodonAccount(db, adminPerson)) as MastodonAccount
		}
	} catch (e) {
		adminAccount = undefined
		console.error(e)
	}
	res.contact_account = adminAccount
	return new Response(JSON.stringify(res), { headers })
}
