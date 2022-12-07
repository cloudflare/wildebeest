const PERSON = "Person";

export type Person = {
  email: string,
  id: string,
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
  };
}

export async function createPerson(db: D1Database, email: string): Promise<void> {
  const id = crypto.randomUUID();

  db.prepare("INSERT INTO actors(id, type, email) VALUES(?, ?, ?)").bind(id, PERSON, email).run();
}
