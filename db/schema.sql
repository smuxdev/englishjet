-- Esquema idempotente (IF NOT EXISTS). Se aplica con `npm run db:migrate`
-- (scripts/migrate.mjs) contra TURSO_DATABASE_URL — nunca al arrancar una
-- function (cold start + carreras). Cambios futuros: ALTER TABLE en ficheros
-- numerados db/migrations/NNN_*.sql.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                -- crypto.randomUUID()
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,                   -- "scrypt$N=...,r=...,p=...$salt_b64$hash_b64"
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,                   -- sha256(token): la BD nunca guarda el token en claro
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Tarjetas por usuario. El progreso Leitner (box/due), la frase propia y las
-- frases extra viven EN la fila: siempre se leen/escriben juntas y ninguna
-- query las descompone (<5k filas por usuario).
CREATE TABLE IF NOT EXISTS cards (
  id                  TEXT PRIMARY KEY,          -- id sintético: editar el término ya no cambia el id
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  english_term        TEXT NOT NULL,
  spanish_translation TEXT NOT NULL,
  example_sentence    TEXT NOT NULL DEFAULT '',
  pronunciation       TEXT,
  examples            TEXT NOT NULL DEFAULT '[]', -- JSON array de frases (hint + extras)
  my_sentence         TEXT,                       -- frase propia del aprendiz (efecto de generación)
  box                 INTEGER NOT NULL DEFAULT 0 CHECK (box BETWEEN 0 AND 5),
  due                 TEXT NOT NULL,              -- YYYY-MM-DD de la próxima revisión
  date_added          TEXT NOT NULL,
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (user_id, english_term COLLATE NOCASE)
);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);

CREATE TABLE IF NOT EXISTS activity (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,                        -- YYYY-MM-DD (zona horaria del cliente)
  reviewed INTEGER NOT NULL DEFAULT 0,
  correct  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Rate-limit de login sin infra extra: ventana rodante por email.
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT PRIMARY KEY,                 -- email normalizado (lowercase)
  fail_count   INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);
