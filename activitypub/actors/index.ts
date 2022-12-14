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

function inboxURL(id: URL): URL {
    return new URL(id + '/inbox')
}

function outboxURL(id: URL): URL {
    return new URL(id + '/outbox')
}

function followingURL(id: URL): URL {
    return new URL(id + '/following')
}

function followersURL(id: URL): URL {
    return new URL(id + '/followers')
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
    const id = actorURL(parts[0]).toString()
    const userKeyPair = await generateUserKey(user_kek)

    let privkey, salt
    // Since D1 and better-sqlite3 behaviors don't exactly match, presumable
    // because Buffer support is different in Node/Worker. We have to transform
    // the values depending on the platform.
    if (isTesting) {
        privkey = Buffer.from(userKeyPair.wrappedPrivKey)
        salt = Buffer.from(userKeyPair.salt)
    } else {
        privkey = [...new Uint8Array(userKeyPair.wrappedPrivKey)]
        salt = [...new Uint8Array(userKeyPair.salt)]
    }

    const properties = {
        preferredUsername: parts[0],
    }

    const { success, error } = await db
        .prepare(
            'INSERT INTO actors(id, type, email, pubkey, privkey, privkey_salt, properties) VALUES(?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, PERSON, email, userKeyPair.pubKey, privkey, salt, JSON.stringify(properties))
        .run()
    if (!success) {
        throw new Error('SQL error: ' + error)
    }
}

export async function getPersonById(db: D1Database, id: URL): Promise<Person | null> {
    const stmt = db.prepare('SELECT * FROM actors WHERE id=? AND type=?').bind(id.toString(), PERSON)
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
        id: row.id + '#icon',
    }
    const image: Object = {
        type: 'Image',
        mediaType: 'image/jpeg',
        url: new URL(defaultImages.header),
        id: row.id + '#image',
    }

    let publicKey = null
    if (row.pubkey !== null) {
        publicKey = {
            id: row.id + '#main-key',
            owner: row.id,
            publicKeyPem: row.pubkey,
        }
    }

    return {
        ...JSON.parse(row.properties),

        type: PERSON,
        id: row.id,
        name: row.id,
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

        // FIXME: stub
        url: 'https://social.eng.chat/@todo',
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
