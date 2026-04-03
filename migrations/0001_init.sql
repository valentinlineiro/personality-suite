PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  unit TEXT,
  target_value REAL,
  dimension_primary TEXT,
  dimension_secondary TEXT,
  archived_at TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habit_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL,
  value REAL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  UNIQUE(user_id, habit_id, date)
);

CREATE TABLE IF NOT EXISTS custom_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  habit_name TEXT NOT NULL,
  habit_type TEXT NOT NULL,
  habit_unit TEXT,
  habit_target_value REAL,
  habit_dimension_primary TEXT,
  habit_dimension_secondary TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_habits_user_updated
  ON habits(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_entries_user_updated
  ON habit_entries(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_entries_user_date
  ON habit_entries(user_id, date);

CREATE INDEX IF NOT EXISTS idx_templates_user_updated
  ON custom_templates(user_id, updated_at);
