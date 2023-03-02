// https://docs.joinmastodon.org/entities/Instance/
// https://docs.joinmastodon.org/methods/instance/
import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import * as error from 'wildebeest/backend/src/errors'
import { DEFAULT_THUMBNAIL } from 'wildebeest/backend/src/config'
import { getVersion } from 'wildebeest/config/versions'
import { calculateInstanceStatistics } from 'wildebeest/backend/src/mastodon/instance'
import { MastodonInstance, InstanceStatistics } from 'wildebeest/backend/src/types/instance'
import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { Database, getDatabase } from 'wildebeest/backend/src/database'
import { getAdmins } from 'wildebeest/functions/api/wb/settings/server/admins'
import { emailSymbol } from 'wildebeest/backend/src/activitypub/actors'

export const onRequest: PagesFunction<Env, any> = async ({ env, request }) => {
	const domain: string = new URL(request.url).hostname
	const db: Database = await getDatabase(env)
	return handleRequest(domain, db, env)
}

export async function handleRequest(domain: string, db: Database, env: Env) {
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}

	const adminActors = await getAdmins(db)
	if (adminActors.length === 0) {
		console.error('Server misconfiguration: missing admin account')
		return error.internalServerError()
	}

	const adminAccounts: Map<string, MastodonAccount> = new Map()
	for (const adminActor of adminActors) {
		const adminAccount = await loadLocalMastodonAccount(db, adminActor)
		adminAccounts.set(adminActor[emailSymbol], adminAccount)
	}

	const contactAccount: MastodonAccount | undefined = adminAccounts.has(env.ADMIN_EMAIL)
		? adminAccounts.get(env.ADMIN_EMAIL)
		: Array.from(adminAccounts.values())[0]
	const instanceStatistics: InstanceStatistics = await calculateInstanceStatistics(domain, db)

	const res: MastodonInstance = {
		uri: domain,
		title: env.INSTANCE_TITLE,
		description: env.INSTANCE_DESCR,
		short_description: env.INSTANCE_DESCR,
		email: env.ADMIN_EMAIL,
		version: getVersion(domain),
		languages: ['en'],
		registrations: env.INSTANCE_ACCEPTING_REGISTRATIONS ?? false,
		approval_required: env.INSTANCE_REGISTRATIONS_REQUIRE_APPROVAL ?? false,
		invites_enabled: false,
		urls: undefined,
		thumbnail: DEFAULT_THUMBNAIL,
		contact_account: contactAccount,
		configuration: {
			statuses: {
				max_characters: env.INSTANCE_CONFIG_STATUSES_MAX_CHARACTERS ?? 500,
				max_media_attachments: 4,
				characters_reserved_per_url: 23,
			},
			media_attachments: {
				supported_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'],
				image_size_limit: 10485760,
				image_matrix_limit: 16777216,
				video_size_limit: 41943040,
				video_frame_rate_limit: 60,
				video_matrix_limit: 2304000,
			},
			polls: {
				max_options: 4,
				max_characters_per_option: 50,
				min_expiration: 300,
				max_expiration: 2629746,
			},
		},
		stats: instanceStatistics,
		rules: [],
	}
	return new Response(JSON.stringify(res), { headers })
}
