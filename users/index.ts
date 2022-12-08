const PERSON = "Person";

export type Person = {
  email: string,
  id: string,
  properties: object,
}

export async function getPersonByEmail(db: D1Database, email: string): Promise<Person | null> {
  const stmt = db.prepare("SELECT * FROM actors WHERE email=? AND type=?").bind(email, PERSON);
  const { results } = await stmt.all();
  if (!results || results.length === 0) {
    return null;
  }
  const person: any = results[0];

  return {
    email,
    id: person.id,
    properties: JSON.parse(person.properties),
  };
}

export async function createPerson(db: D1Database, email: string): Promise<void> {
  const parts = email.split("@");
  const id = parts[0];

  db.prepare("INSERT INTO actors(id, type, email) VALUES(?, ?, ?)").bind(id, PERSON, email).run();
}

export async function getPersonById(db: D1Database, id: string): Promise<Person | null> {
  const stmt = db.prepare("SELECT * FROM actors WHERE id=? AND type=?").bind(id, PERSON);
  const { results } = await stmt.all();
  if (!results || results.length === 0) {
    return null;
  }
  const person: any = results[0];

  return {
    id,
    email: person.email,
    properties: JSON.parse(person.properties),
  };
}
