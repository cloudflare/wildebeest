import { MastodonAccount } from 'wildebeest/types/account'
import { generateUserKey } from 'wildebeest/utils/key-ops'

const PERSON = 'Person'

const headers = {
    accept: 'application/activity+json',
}

export async function get(url: string): Promise<any> {
    const res = await fetch(url, { headers })
    if (!res.ok) {
        throw new Error(`${url} returned: ${res.status}`)
    }

    return res.json<any>()
}

export type Person = {
    email: string
    id: string
    properties: object
    pubkey: string
}

export async function getPersonByEmail(db: D1Database, email: string): Promise<Person | null> {
    const stmt = db.prepare('SELECT * FROM actors WHERE email=? AND type=?').bind(email, PERSON)
    const { results } = await stmt.all()
    if (!results || results.length === 0) {
        return null
    }
    const person: any = results[0]

    return {
        email,
        id: person.id,
        properties: JSON.parse(person.properties),
        pubkey: person.pubkey,
    }
}

export async function createPerson(db: D1Database, user_kek: string, email: string): Promise<void> {
    const parts = email.split('@')
    const id = parts[0]

    const userKeyPair = await generateUserKey(user_kek)

    db.prepare('INSERT INTO actors(id, type, email, pubkey, privkey) VALUES(?, ?, ?, ?, ?)')
        .bind(id, PERSON, email, userKeyPair.pubKey, Buffer.from(userKeyPair.wrappedPrivKey))
        .run()
}

export async function getPersonById(db: D1Database, id: string): Promise<Person | null> {
    const stmt = db.prepare('SELECT * FROM actors WHERE id=? AND type=?').bind(id, PERSON)
    const { results } = await stmt.all()
    if (!results || results.length === 0) {
        return null
    }
    const person: any = results[0]

    return {
        id,
        email: person.email,
        properties: JSON.parse(person.properties),
        pubkey: person.pubkey,
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
        statuses_count: 3,
        emojis: [],
        fields: [],
    }
}
