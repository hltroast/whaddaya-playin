const { DatabaseSync } = require('node:sqlite');

function openDatabase(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS Games (
      game_id        INTEGER PRIMARY KEY,
      name          TEXT NOT NULL,
      developers    TEXT,
      publishers    TEXT,
      release_date  TEXT,
      listed_price   REAL,
      capsule_image TEXT,
      total_positive INTEGER,
      total_reviews INTEGER,
      review_score  REAL,
      hidden        INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
      last_fetched  TEXT
    );

    CREATE TABLE IF NOT EXISTS Tags (
      tag_id INTEGER PRIMARY KEY,
      tag_name   TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS GameTags (
      game_id       INTEGER NOT NULL REFERENCES Games(game_id) ON DELETE CASCADE,
      tag_id       INTEGER NOT NULL REFERENCES Tags(tag_id),
      score     INTEGER NOT NULL CHECK (score BETWEEN 1 AND 20),
      PRIMARY KEY (game_id, tag_id),
      UNIQUE (game_id, score)
    );

    CREATE INDEX IF NOT EXISTS idx_gametags_tag ON GameTags(tag_id);

    CREATE TABLE IF NOT EXISTS Wishlist (
      game_id INTEGER PRIMARY KEY REFERENCES Games(game_id) ON DELETE CASCADE,
      date_added TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Library (
      game_id INTEGER PRIMARY KEY REFERENCES Games(game_id) ON DELETE CASCADE,
      date_added TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

module.exports = { openDatabase };