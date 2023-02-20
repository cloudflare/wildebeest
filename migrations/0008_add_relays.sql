-- Migration number: 0008 	 2023-02-20T15:47:44.001Z

CREATE TABLE IF NOT EXISTS relays (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL UNIQUE,

  FOREIGN KEY(actor_id) REFERENCES actors(id)
);
