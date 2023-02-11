// https://docs.joinmastodon.org/entities/Instance/
import type { Env } from 'wildebeest/backend/src/types/env'
import 'wildebeest/backend/src/types/instance'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { DEFAULT_THUMBNAIL } from 'wildebeest/backend/src/config'
import { MASTODON_API_VERSION } from 'wildebeest/config/versions'
import { MastodonInstance } from 'wildebeest/backend/src/types/instance'

export const onRequest: PagesFunction<Env, any> = async ({ env, request }) => {
	const domain = new URL(request.url).hostname
  console.log(`Request: ${domain} vs. Env: ${env.DOMAIN}`)
	return handleRequest(env)
}

export async function handleRequest(env: Env) {
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}

	const res: MastodonInstance = {}
  // res.uri = domain.trim().replace(/https?:[/]{2}/i, '')
  res.uri = env.DOMAIN
  res.title = env.INSTANCE_TITLE
  res.description = env.INSTANCE_DESCR
  res.short_description = env.INSTANCE_DESCR
  res.email = env.ADMIN_EMAIL
  res.version = MASTODON_API_VERSION
  res.languages = ['en']
  res.registrations = true
  res.approval_required = false
  res.invites_enabled = false
	res.urls = {
    streaming_api:"https://streaming.fedified.com"
  }
  res.statistics = {} // TODO: Calculate actual statistics
  res.thumbnail = DEFAULT_THUMBNAIL
  res.contact_account = {}
  res.rules = []
  res.configuration = {
    "statuses":{
      "max_characters":500,
      "max_media_attachments":4,
      "characters_reserved_per_url":23
    },
    "media_attachments":{
      "supported_mime_types":[
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4"
      ],
      "image_size_limit":10485760,
      "image_matrix_limit":16777216,
      "video_size_limit":41943040,
      "video_frame_rate_limit":60,
      "video_matrix_limit":2304000
    },
    "polls":{
      "max_options":4,
      "max_characters_per_option":50,
      "min_expiration":300,
      "max_expiration":2629746
    }
  }

	return new Response(JSON.stringify(res), { headers })
}
