import type { MastodonAccount } from './account'

// https://docs.joinmastodon.org/entities/Instance/
// https://github.com/mastodon/mastodon-ios/blob/develop/MastodonSDK/Sources/MastodonSDK/Entity/Mastodon%2BEntity%2BInstance.swift
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Instance.java
export interface MastodonInstance {
	uri: string
	title: string
	description: string
	short_description: string
	email: string
	version?: string
	languages?: Array<string>
	registrations?: boolean
	approval_required?: boolean
	invites_enabled?: boolean
	urls?: InstanceURL
	statistics?: InstanceStatistics
	stats?: InstanceStatistics
	thumbnail?: string
	contact_account?: MastodonAccount
	rules?: Array<InstanceRule>
	configuration?: InstanceConfiguration
}

export interface InstanceURL {
	streaming_api: string
}

export type InstanceStatistics = {
	user_count: number
	status_count: number
	domain_count: number
}

export type InstanceRule = {
	id: string
	text: string
}

export type InstanceConfiguration = {
	statuses?: StatusesConfiguration
	media_attachments?: MediaAttachmentsConfiguration
	polls?: PollsConfiguration
}

export type StatusesConfiguration = {
	max_characters: number
	max_media_attachments: number
	characters_reserved_per_url: number
}

export type MediaAttachmentsConfiguration = {
	supported_mime_types: Array<string>
	image_size_limit: number
	image_matrix_limit: number
	video_size_limit: number
	video_frame_rate_limit: number
	video_matrix_limit: number
}

export type PollsConfiguration = {
	max_options: number
	max_characters_per_option: number
	min_expiration: number
	max_expiration: number
}