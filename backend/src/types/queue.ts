import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'

export type MessageType = 'activity'

export type MessageBody = {
	type: MessageType
	actorId: string
	content: Activity

	// Send secrets as part of the message because it's too complicated
	// to bind them to the consumer worker.
	userKEK: string
	vapidKeys: JWK
}
