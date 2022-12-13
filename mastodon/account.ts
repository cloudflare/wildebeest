import { MastodonAccount } from 'wildebeest/types/account'
import type { Actor } from '../activitypub/actors/'
import { defaultImages } from '../config/accounts'

export function toMastodonAccount(acct: string, res: Actor): MastodonAccount {
    let avatar = defaultImages.avatar
    let header = defaultImages.header

    if (res.icon !== undefined && typeof res.icon.url === 'string') {
        avatar = res.icon.url
    }
    if (res.image !== undefined && typeof res.image.url === 'string') {
        header = res.image.url
    }

    return {
        acct,

        id: acct,
        username: res.preferredUsername ? res.preferredUsername : res.id,
        url: res.url ? res.url.toString() : '',
        display_name: res.name || '',
        note: res.summary || '',
        created_at: res.published || new Date().toISOString(),

        avatar,
        avatar_static: avatar,

        header,
        header_static: header,

        locked: false,
        bot: false,
        discoverable: true,
        group: false,

        followers_count: 0,
        following_count: 0,
        statuses_count: 0,

        emojis: [],
        fields: [],
    }
}
