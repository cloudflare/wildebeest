import { MastodonAccount } from 'wildebeest/types/account'
import { defaultImages } from 'wildebeest/config/accounts'
import { instanceConfig } from 'wildebeest/config/instance'
import { generateUserKey } from 'wildebeest/utils/key-ops'
import type { Object } from '../objects'

const PERSON = 'Person'
const isTesting = typeof jest !== 'undefined'

export function actorURL(id: string): URL {
    return new URL(`/ap/users/${id}`, 'https://' + instanceConfig.uri)
}

function inboxURL(id: string): URL {
    return new URL(`/ap/users/${id}/inbox`, 'https://' + instanceConfig.uri)
}

function outboxURL(id: string): URL {
    return new URL(`/ap/users/${id}/outbox`, 'https://' + instanceConfig.uri)
}

function followingURL(id: string): URL {
    return new URL(`/ap/users/${id}/following`, 'https://' + instanceConfig.uri)
}

function followersURL(id: string): URL {
    return new URL(`/ap/users/${id}/followers`, 'https://' + instanceConfig.uri)
}

// https://www.w3.org/TR/activitystreams-vocabulary/#actor-types
export interface Actor extends Object {
    inbox: URL
    outbox: URL
    following: URL
    followers: URL
}

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-person
export interface Person extends Actor {
    // TODO: shouldn't return email publicly
    email: string
    publicKey: string
}

const headers = {
    accept: 'application/activity+json',
}

export async function get(url: string): Promise<Actor> {
    const res = await fetch(url, { headers })
    if (!res.ok) {
        throw new Error(`${url} returned: ${res.status}`)
    }

    return res.json<Actor>()
}

export async function getPersonByEmail(db: D1Database, email: string): Promise<Person | null> {
    const stmt = db.prepare('SELECT * FROM actors WHERE email=? AND type=?').bind(email, PERSON)
    const { results } = await stmt.all()
    if (!results || results.length === 0) {
        return null
    }
    const row: any = results[0]
    return personFromRow(row)
}

export async function createPerson(db: D1Database, user_kek: string, email: string): Promise<void> {
    const parts = email.split('@')
    const id = parts[0]

    const userKeyPair = await generateUserKey(user_kek)

    let privkey, salt
    // Since D1 and better-sqlite3 behaviors don't exactly match, presumable
    // because Buffer support is different in Node/Worker. We have to transform
    // the values depending on the platform.
    if (isTesting) {
        const privkey = userKeyPair.wrappedPrivKey
        const salt = userKeyPair.salt
    } else {
        const privkey = [...new Uint8Array(userKeyPair.wrappedPrivKey)]
        const salt = [...new Uint8Array(userKeyPair.salt)]
    }

    const { success, error } = await db
        .prepare('INSERT INTO actors(id, type, email, pubkey, privkey, privkey_salt) VALUES(?, ?, ?, ?, ?, ?)')
        .bind(id, PERSON, email, userKeyPair.pubKey, privkey, salt)
        .run()
    if (!success) {
        throw new Error('SQL error: ' + error)
    }
}

export async function getPersonById(db: D1Database, id: string): Promise<Person | null> {
    const stmt = db.prepare('SELECT * FROM actors WHERE id=? AND type=?').bind(id, PERSON)
    const { results } = await stmt.all()
    if (!results || results.length === 0) {
        return null
    }
    const row: any = results[0]
    return personFromRow(row)
}

function personFromRow(row: any): Person {
    const icon: Object = {
        type: 'Image',
        mediaType: 'image/jpeg',
        url: new URL(defaultImages.avatar),
        id: actorURL(row.id) + '#icon',
    }
    const image: Object = {
        type: 'Image',
        mediaType: 'image/jpeg',
        url: new URL(defaultImages.header),
        id: actorURL(row.id) + '#image',
    }

    let publicKey = null
    if (row.pubkey !== null) {
        publicKey = {
            id: actorURL(row.id) + '#main-key',
            owner: actorURL(row.id),
            publicKeyPem: row.pubkey,
        }
    }

    return {
        ...JSON.parse(row.properties),

        type: PERSON,
        id: actorURL(row.id),
        url: 'https://social.eng.chat/@' + row.id,
        name: row.id,
        preferredUsername: row.id,
        published: new Date(row.cdate).toISOString(),
        discoverable: true,
        inbox: inboxURL(row.id),
        outbox: outboxURL(row.id),
        following: followingURL(row.id),
        followers: followersURL(row.id),
        email: row.email,
        publicKey,
        icon,
        image,
    }
}

export function toMastodonAccount(person: Person): MastodonAccount {
    return {
        id: person.id,
        username: person.email.replace('@', '_').replace('.', '_'),
        acct: person.email.replace('@', '_').replace('.', '_'),
        display_name: person.email,
        locked: false,
        bot: false,
        discoverable: false,
        group: false,
        created_at: '2022-12-01T00:00:00.000Z',
        note: '',
        url: 'https://social.that-test.site/@sven2',
        avatar: 'https://jpeg.speedcf.com/cat/23.jpg',
        avatar_static: 'https://jpeg.speedcf.com/cat/23.jpg',
        header: 'https://jpeg.speedcf.com/cat/22.jpg',
        header_static: 'https://jpeg.speedcf.com/cat/22.jpg',
        followers_count: 0,
        following_count: 0,
        statuses_count: 0,
        emojis: [],
        fields: [],
    }
}
