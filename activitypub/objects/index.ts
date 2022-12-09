import { instanceConfig } from 'wildebeest/config/instance'

export function uri(id: string): URL {
    return new URL('/ap/o/' + id, 'https://' + instanceConfig.uri)
}
