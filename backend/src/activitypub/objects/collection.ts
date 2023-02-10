import type { APObject } from 'wildebeest/backend/src/activitypub/objects'

export interface Collection<T> extends APObject {
	totalItems: number
	current?: string
	first: URL
	last: URL
	items: Array<T>
}

export interface OrderedCollection<T> extends Collection<T> {}

export interface OrderedCollectionPage<T> extends APObject {
	orderedItems: Array<T>
}

const headers = {
	accept: 'application/activity+json',
}

export async function getMetadata(url: URL): Promise<OrderedCollection<any>> {
	const res = await fetch(url, { headers })
	if (!res.ok) {
		throw new Error(`${url} returned ${res.status}`)
	}

	return res.json<OrderedCollection<any>>()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loadItems<T>(collection: OrderedCollection<T>, max?: number): Promise<Array<T>> {
	// FIXME: implement max and multi page support

	const res = await fetch(collection.first, { headers })
	if (!res.ok) {
		throw new Error(`${collection.first} returned ${res.status}`)
	}

	const data = await res.json<OrderedCollectionPage<T>>()
	return data.orderedItems
}
