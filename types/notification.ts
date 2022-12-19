import type { MastodonAccount } from 'wildebeest/types/account'
import type { MastodonStatus } from 'wildebeest/types/status'

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
