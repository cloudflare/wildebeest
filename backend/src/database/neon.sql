-- Migration number: 0000 	 2022-12-05T20:27:34.391Z

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  email TEXT,
  privkey bytea,
  privkey_salt bytea,
  pubkey TEXT,
  cdate timestamp NOT NULL DEFAULT (now()),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS actors_email ON actors(email);

CREATE TABLE IF NOT EXISTS actor_following (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_actor_id TEXT NOT NULL,
  target_actor_acct TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  cdate timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX IF NOT EXISTS actor_following_actor_id ON actor_following(actor_id);
CREATE INDEX IF NOT EXISTS actor_following_target_actor_id ON actor_following(target_actor_id);

CREATE TABLE IF NOT EXISTS objects (
  id TEXT PRIMARY KEY,
  mastodon_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now()),
  original_actor_id TEXT,
  original_object_id TEXT UNIQUE,
  reply_to_object_id TEXT,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  local INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inbox_objects (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS outbox_objects (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now()),
  published_date timestamp NOT NULL DEFAULT (now())

);

CREATE TABLE IF NOT EXISTS actor_notifications (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  from_actor_id TEXT NOT NULL,
  object_id TEXT,
  cdate timestamp NOT NULL DEFAULT (now())

);

CREATE INDEX IF NOT EXISTS actor_notifications_actor_id ON actor_notifications(actor_id);

CREATE TABLE IF NOT EXISTS actor_favourites (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now())

);

CREATE INDEX IF NOT EXISTS actor_favourites_actor_id ON actor_favourites(actor_id);
CREATE INDEX IF NOT EXISTS actor_favourites_object_id ON actor_favourites(object_id);

CREATE TABLE IF NOT EXISTS actor_reblogs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now())

);

CREATE INDEX IF NOT EXISTS actor_reblogs_actor_id ON actor_reblogs(actor_id);
CREATE INDEX IF NOT EXISTS actor_reblogs_object_id ON actor_reblogs(object_id);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  name TEXT NOT NULL,
  redirect_uris TEXT NOT NULL,
  website TEXT,
  scopes TEXT,
  cdate timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS actor_replies (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  in_reply_to_object_id TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now())

);

CREATE INDEX IF NOT EXISTS actor_replies_in_reply_to_object_id ON actor_replies(in_reply_to_object_id);
-- Migration number: 0001 	 2023-01-16T13:09:04.033Z

CREATE UNIQUE INDEX unique_actor_following ON actor_following (actor_id, target_actor_id);
-- Migration number: 0002 	 2023-01-16T13:46:54.975Z

ALTER TABLE outbox_objects
  ADD target TEXT NOT NULL DEFAULT 'https://www.w3.org/ns/activitystreams#Public';
-- Migration number: 0003 	 2023-02-02T15:03:27.478Z

CREATE TABLE IF NOT EXISTS peers (
  domain TEXT UNIQUE NOT NULL
);
-- Migration number: 0004 	 2023-02-03T17:17:19.099Z

CREATE INDEX IF NOT EXISTS outbox_objects_actor_id ON outbox_objects(actor_id);
CREATE INDEX IF NOT EXISTS outbox_objects_target ON outbox_objects(target);
-- Migration number: 0005 	 2023-02-07T10:57:21.848Z

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  expires_at timestamp NOT NULL

);
-- Migration number: 0006 	 2023-02-13T11:18:03.485Z

CREATE TABLE IF NOT EXISTS note_hashtags (
  value TEXT NOT NULL,
  object_id TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now())

);
-- Migration number: 0007 	 2023-02-15T11:01:46.585Z

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  actor_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  key_p256dh TEXT NOT NULL,
  key_auth TEXT NOT NULL,
  alert_mention INTEGER NOT NULL,
  alert_status INTEGER NOT NULL,
  alert_reblog INTEGER NOT NULL,
  alert_follow INTEGER NOT NULL,
  alert_follow_request INTEGER NOT NULL,
  alert_favourite INTEGER NOT NULL,
  alert_poll INTEGER NOT NULL,
  alert_update INTEGER NOT NULL,
  alert_admin_sign_up INTEGER NOT NULL,
  alert_admin_report INTEGER NOT NULL,
  policy TEXT NOT NULL,
  cdate timestamp NOT NULL DEFAULT (now()),

  UNIQUE(actor_id, client_id)
);

-- Migration number: 0003   2023-02-24T15:03:27.478Z

CREATE TABLE IF NOT EXISTS server_settings (
  setting_name TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS server_rules (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL
);

-- Migration number: 0009    2023-02-28T13:58:08.319Z

ALTER TABLE actors
  ADD is_admin INTEGER;

UPDATE actors SET is_admin = 1
WHERE id = 
    (SELECT id
    FROM actors
    ORDER BY  cdate ASC LIMIT 1 );

-- Migration number: 0010 	 2023-03-08T09:40:30.734Z

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO clients (id, secret, name, redirect_uris, scopes)
VALUES ('924801be-d211-495d-8cac-e73503413af8', encode(gen_random_bytes(42), 'hex'), 'Wildebeest User Interface', '/', 'all');
