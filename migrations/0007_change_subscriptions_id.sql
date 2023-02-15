-- Migration number: 0007 	 2023-02-15T11:01:46.585Z

DROP table subscriptions;

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  endpoint TEXT NULL NOT NULL,
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
  cdate DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),

  UNIQUE(actor_id, client_id)
  FOREIGN KEY(actor_id)  REFERENCES actors(id),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);
