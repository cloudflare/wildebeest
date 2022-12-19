// These are VERY rough at the moment. Need to comb over the
// api docs to identify optional and nullable fields.
// It might also be a good idea to use something like Zod and
// then generate or infer type definitions from the schemas

export type Status = {
  id: string
  content: string
  created_at: string
  in_reply_to_id: string | null
  in_reply_to_account_id: string | null
  sensitive: boolean
  spoiler_text: string
  visibility: 'public' | 'private'
  language: string
  uri: string
  url: string
  replies_count: number
  reblogs_count: number
  favourites_count: number
  edited_at: string | null
  reblog: Reblog | null
  application?: Application
  media_attachments: MediaAttachment[]
  mentions: Mention[]
  tags: Tag[]
  emojis: any[]
  account: Account
  card: any
  poll: any
}

export type Account = {
  id: string
  username: string
  acct: string
  display_name: string
  locked: boolean
  bot: boolean
  discoverable: boolean
  group: boolean
  created_at: string
  note: string
  url: string
  avatar: string
  avatar_static: string
  header: string
  header_static: string
  followers_count: number
  following_count: number
  statuses_count: number
  last_status_at: string
  noindex?: boolean
  emojis: []
  fields: AccountField[]
}

export type AccountField = {
  name: string
  value: string
  verified_at: string | null
}

export type Mention = {
  id: string
  username: string
  url: string
  acct: string
}

export type Tag = {
  name: string
  url: string
}

export type Application = {
  name: string
  website: string | null
}

export type Reblog = {
  id: string
  created_at: string
  favourited: false
  reblogged: true
  muted: false
  bookmarked: false
  pinned: false
}

export type MediaAttachment = {
  id: string
  type: string
  url: string
  preview_url: string | null
  remote_url: string | null
  preview_remote_url: string | null
  text_url: string | null
  meta: {
    original: MediaMeta
    small: MediaMeta
    focus?: Point
  }
  description: string | null
  blurhash: string
}

export type MediaMeta = {
  width: number
  height: number
  size: string
  aspect: number
}

export type Point = {
  x: number
  y: number
}

export type InstanceDetails = {
  domain: string
  title: string
  version: string
  source_url: string
  description: string
  usage: { users: { active_month: number } }
  thumbnail: InstanceThumbnail
  languages: string[]
  configuration: {
    urls: Record<string, string>
    accounts: { max_featured_tags: number }
    statuses: {
      max_characters: number
      max_media_attachments: number
      characters_reserved_per_url: number
    }
    media_attachments: {
      supported_mime_types: string[]
      image_size_limit: number
      image_matrix_limit: number
      video_size_limit: number
      video_frame_rate_limit: number
      video_matrix_limit: number
    }
    polls: {
      max_options: number
      max_characters_per_option: number
      min_expiration: number
      max_expiration: number
    }
    translation: { enabled: boolean }
  }
  registrations: {
    enabled: boolean
    approval_required: boolean
    message: string | null
  }
  contact: {
    email: string
    account: Account
  }
  rules: InstanceRule[]
}

export type InstanceThumbnail = {
  url: string
  blurhash: string
  versions: Record<string, string>
}

export type InstanceRule = {
  id: string
  text: string
}

export type TagDetails = {
  name: string
  url: string
  history: TagHistory[]
}

export type TagHistory = {
  day: string
  accounts: string
  uses: string
}
