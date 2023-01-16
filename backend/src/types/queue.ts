import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'

export enum MessageType {
	Inbox = 1,
	Deliver,
}

export interface MessageBody {
	type: MessageType
	actorId: string
}

// ActivityPub messages received by an Actor's Inbox are sent into the queue.
export interface InboxMessageBody extends MessageBody {
	activity: Activity

	// Send secrets as part of the message because it's too complicated
	// to bind them to the consumer worker.
	userKEK: string
	vapidKeys: JWK
}

// ActivityPub message delivery job are sent to the queue and the consumer does
// the actual delivery.
export interface DeliverMessageBody extends MessageBody {
	activity: Activity
	toActorId: string

	// Send secrets as part of the message because it's too complicated
	// to bind them to the consumer worker.
	userKEK: string
}

export type MessageSendRequest<Body = MessageBody> = {
	body: Body
}

export interface Queue<Body = MessageBody> {
	send(body: Body): Promise<void>
	sendBatch(messages: Iterable<MessageSendRequest<Body>>): Promise<void>
}
