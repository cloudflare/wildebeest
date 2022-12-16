import type { Object } from 'wildebeest/activitypub/objects/'

export interface Collection<T> extends Object {
    totalItems: number
    current?: string
    first: URL
    last: URL
    items: Array<T>
}

export interface OrderedCollection<T> extends Collection<T> {}

export interface OrderedCollectionPage<T> extends Object {
    orderedItems: Array<T>
}
