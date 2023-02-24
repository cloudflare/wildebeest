-- Migration number: 0006 	 2023-02-13T11:18:03.485Z

CREATE TABLE IF NOT EXISTS note_hashtags (
  value TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),

  FOREIGN KEY(object_id) REFERENCES objects(id)
);
