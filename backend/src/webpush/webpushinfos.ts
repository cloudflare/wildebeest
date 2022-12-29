export interface WebPushInfos {
	endpoint: string
	key: string
	auth: string

	// supportedAlgorithms: string[]; // this will be used in future
}

type Urgency = 'very-low' | 'low' | 'normal' | 'high'

export interface WebPushMessage {
	data: string
	urgency: Urgency
	sub: string
	ttl: number
}

export enum WebPushResult {
	Success = 0,
	Error = 1,
	NotSubscribed = 2,
}
