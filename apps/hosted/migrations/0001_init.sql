-- docs/spec/05-data-model.html
CREATE TABLE projects (
  key             TEXT PRIMARY KEY,
  installation_id INTEGER NOT NULL,
  repo            TEXT NOT NULL UNIQUE,
  allowed_origins TEXT NOT NULL DEFAULT '',
  daily_limit     INTEGER,
  active          INTEGER NOT NULL DEFAULT 1,
  banned          INTEGER NOT NULL DEFAULT 0, -- 運営による停止。/setup では解除しない
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX projects_installation ON projects(installation_id);
CREATE TABLE usage (
  key   TEXT NOT NULL,
  day   TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, day)
);
CREATE TABLE recent_hashes (
  hash       TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
