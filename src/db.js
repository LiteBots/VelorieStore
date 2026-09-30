const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DB_FILE } = require('./env');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  username TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  is_seller INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  store_name TEXT,
  store_slug TEXT UNIQUE,
  google_id TEXT UNIQUE,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  payout_method TEXT,
  payout_details TEXT,
  banned INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  tags TEXT DEFAULT '',
  version TEXT DEFAULT '1.0.0',
  compatibility TEXT DEFAULT '',
  cover_url TEXT,
  gallery TEXT DEFAULT '[]',
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER DEFAULT 0,
  license_enabled INTEGER DEFAULT 1,
  max_activations INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  featured INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_versions (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  changelog TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  subtotal INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  provider TEXT,
  provider_ref TEXT,
  coupon_code TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  seller_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  fee INTEGER DEFAULT 0,
  net INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_item_id INTEGER,
  status TEXT DEFAULT 'active',
  max_activations INTEGER DEFAULT 1,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS license_activations (
  id INTEGER PRIMARY KEY,
  license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  ip TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  UNIQUE(license_id, identifier)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS wishlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  percent INTEGER NOT NULL,
  product_id INTEGER,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(seller_id, code)
);

CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, category);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_items_seller ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_user ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_product ON licenses(product_id);
`);

// Pomocnicze skróty
const q = {
  get: (sql, ...p) => db.prepare(sql).get(...p),
  all: (sql, ...p) => db.prepare(sql).all(...p),
  run: (sql, ...p) => db.prepare(sql).run(...p),
};

function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function getSetting(key, fallback = null) {
  const row = q.get('SELECT value FROM settings WHERE key = ?', key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}
function setSetting(key, value) {
  q.run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value));
}

module.exports = { db, q, tx, getSetting, setSetting };
