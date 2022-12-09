import { generateUserKey } from 'wildebeest/utils/key-ops'

const PERSON = 'Person'

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
