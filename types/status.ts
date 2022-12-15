// https://docs.joinmastodon.org/entities/Status/
import type { MastodonAccount } from './account'

type Visibility = 'public' | 'unlisted' | 'private' | 'direct'

export type MastodonStatus = {
    id: string
    uri: URL
    created_at: string
    account: MastodonAccount
    content: string
    visibility: Visibility
    spoiler_text: string
}
