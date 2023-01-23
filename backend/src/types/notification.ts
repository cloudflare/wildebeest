import type { MastodonAccount } from 'wildebeest/backend/src/types/account'
import type { MastodonStatus } from 'wildebeest/backend/src/types/status'
import type { ObjectsRow } from './objects'

export type NotificationType =
	| 'mention'
	| 'status'
	| 'reblog'
	| 'follow'
	| 'follow_request'
	| 'favourite'
	| 'poll'
	| 'update'
	| 'admin.sign_up'
	| 'admin.report'

export type Notification = {
	id: string
	type: NotificationType
	created_at: string
	account: MastodonAccount
	status?: MastodonStatus
}

export interface NotificationsQueryResult extends ObjectsRow {
	type: NotificationType
	original_actor_id: URL
	notif_from_actor_id: URL
	notif_cdate: string
	notif_id: URL
	from_actor_id: string
}
