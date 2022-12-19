-- Migration number: 0000 	 2022-12-05T20:27:34.391Z

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  email TEXT,
  privkey BLOB,
  privkey_salt BLOB,
  pubkey TEXT,
  cdate DATETIME NOT NULL DEFAULT (datetime()),
  properties TEXT NOT NULL DEFAULT (json_object())
);

CREATE TABLE IF NOT EXISTS actor_following (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_actor_id TEXT NOT NULL,
  target_actor_acct TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  cdate DATETIME NOT NULL DEFAULT (datetime()),

  FOREIGN KEY(actor_id)  REFERENCES actors(id),
  FOREIGN KEY(target_actor_id)  REFERENCES actors(id)
);

CREATE TABLE IF NOT EXISTS objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  cdate DATETIME NOT NULL DEFAULT (datetime()),
  originating_actor TEXT,
  properties TEXT NOT NULL DEFAULT (json_object())
);

CREATE TABLE IF NOT EXISTS inbox_objects (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate DATETIME NOT NULL DEFAULT (datetime()),

  FOREIGN KEY(actor_id)  REFERENCES actors(id),
  FOREIGN KEY(object_id) REFERENCES objects(id)
);

CREATE TABLE IF NOT EXISTS outbox_objects (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate DATETIME NOT NULL DEFAULT (datetime()),

  FOREIGN KEY(actor_id)  REFERENCES actors(id),
  FOREIGN KEY(object_id) REFERENCES objects(id)
);

CREATE TABLE IF NOT EXISTS actor_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  from_actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate DATETIME NOT NULL DEFAULT (datetime()),

  FOREIGN KEY(actor_id)  REFERENCES actors(id),
  FOREIGN KEY(from_actor_id)  REFERENCES actors(id),
  FOREIGN KEY(object_id) REFERENCES objects(id)
);
