import { MastodonAccount } from 'wildebeest/types/account'
import type { Actor } from '../activitypub/actors/'
import { defaultImages } from '../config/accounts'

async function getStatusesCount(db: D1Database, actorId: URL): Promise<number> {
    const query = `
SELECT count(*) as count
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE outbox_objects.actor_id=? AND objects.type = 'Note'
  `

    const row: any = await db.prepare(query).bind(actorId.toString()).first()
    return row.count
}

function toMastodonAccount(acct: string, res: Actor): MastodonAccount {
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
        display_name: res.preferredUsername || '',
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

        emojis: [],
        fields: [],
    }
}

export function loadExternalMastodonAccount(acct: string, res: Actor): MastodonAccount {
    return toMastodonAccount(acct, res)
}

export async function loadLocalMastodonAccount(db: D1Database, acct: string, res: Actor): Promise<MastodonAccount> {
    const account = toMastodonAccount(acct, res)
    account.statuses_count = await getStatusesCount(db, new URL(res.id))

    return account
}
