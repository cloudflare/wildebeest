import { instanceConfig } from 'wildebeest/config/instance'

// https://www.w3.org/TR/activitystreams-vocabulary/#object-types
export interface Object {
    type: string
    id: string
    url: URL
    published?: string
    icon?: Object
    image?: Object
    summary?: string
    name?: string

    // Extension
    preferredUsername?: string
}

export function uri(id: string): URL {
    return new URL('/ap/o/' + id, 'https://' + instanceConfig.uri)
}
