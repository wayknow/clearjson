-- ClearJSON License Server — D1 Database Schema
-- Run: npx wrangler d1 execute clearjson-license-db --file=./schema.sql

-- License keys table
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'expired')),
  tier TEXT NOT NULL DEFAULT 'pro'
    CHECK (tier IN ('pro')),
  max_devices INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,                                    -- NULL = lifetime
  creem_customer_id TEXT,
  creem_order_id TEXT,
  notes TEXT
);

-- Device activations per license
CREATE TABLE IF NOT EXISTS activations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT DEFAULT '',
  activated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (license_key) REFERENCES licenses(license_key),
  UNIQUE(license_key, device_id)                      -- one activation per device per license
);

-- API tokens for authenticated endpoints (generate/admin)
CREATE TABLE IF NOT EXISTS api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,                     -- SHA-256 hash of the token
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_activations_license ON activations(license_key);
CREATE INDEX IF NOT EXISTS idx_activations_device ON activations(device_id);
