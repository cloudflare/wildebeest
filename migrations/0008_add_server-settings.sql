-- Migration number: 0003   2023-02-24T15:03:27.478Z

CREATE TABLE IF NOT EXISTS server_settings (
  setting_name TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS server_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL
);
