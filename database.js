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

function storeTags(db, tags) {
  const updateInsert = db.prepare(
    `INSERT INTO Tags (tag_id, tag_name) VALUES (?, ?)
    ON CONFLICT(tag_id) DO UPDATE SET tag_name = excluded.tag_name`);
  for (const tag of tags) {
    updateInsert.run(tag.tagid, tag.name);
  }
}

function storeGame(db,item) {
  const reviews = item.reviews?.summary_filtered;
  const totalReviews = reviews?.review_count ?? null;
  const totalPositive = reviews ? Math.round(reviews.review_count * reviews.percent_positive/100) : null;
  const reviewScore =  totalReviews ? totalPositive / totalReviews : null;

  const releaseSeconds = item.release?.steam_release_date;
  const releaseDate = releaseSeconds ? new Date(releaseSeconds*1000).toISOString().slice(0,10) : null;
  
  const priceCents = item.best_purchase_option?.final_price_in_cents;
  const listedPrice = priceCents ? Number(priceCents)/100 : null;

  const capsule = item.assets ? item.assets.asset_url_format.replace('${FILENAME}', item.assets.main_capsule) : null;

  const developers = JSON.stringify((item.basic_info?.developers ?? []).map(d => d.name));
  const publishers = JSON.stringify((item.basic_info?.publishers ?? []).map(p => p.name));

db.exec('BEGIN');
try{
  db.prepare(
    `INSERT INTO Games (game_id, name, developers, publishers, release_date, listed_price, capsule_image, total_positive, total_reviews, review_score, last_fetched)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(game_id) DO UPDATE SET
      name = excluded.name,
      developers = excluded.developers,
      publishers = excluded.publishers,
      release_date = excluded.release_date,
      listed_price = excluded.listed_price,
      capsule_image = excluded.capsule_image,
      total_positive = excluded.total_positive,
      total_reviews = excluded.total_reviews,
      review_score = excluded.review_score,
      last_fetched = excluded.last_fetched`).run(item.appid, item.name, developers, publishers, releaseDate, listedPrice, capsule, totalPositive, totalReviews, reviewScore);

  db.prepare('DELETE FROM GameTags WHERE game_id = ?').run(item.appid);
  const insertTag = db.prepare('INSERT INTO GameTags (game_id, tag_id, score) VALUES (?, ?, ?)');
  (item.tags ?? []).forEach((tag, i) => {
    insertTag.run(item.appid, tag.tagid, 20-i);
  });

  db.exec('COMMIT');
  } catch(error) {
  db.exec('ROLLBACK');
  throw error;
  }
}

module.exports = { openDatabase, storeTags, storeGame };