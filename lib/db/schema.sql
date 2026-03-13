-- ============================================
-- Multi-user Goal Journal Schema
-- ============================================

-- Auth tables
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Goal definitions: user-defined goals with frequency and tracking type
CREATE TABLE goal_definitions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
  tracking_type TEXT NOT NULL CHECK (tracking_type IN ('boolean', 'number')),
  target_value NUMERIC,
  unit TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goal_defs_user ON goal_definitions(user_id, frequency);

-- Goal logs: one entry per goal per period
CREATE TABLE goal_logs (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goal_definitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  value NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, period_date)
);

CREATE INDEX idx_goal_logs_user_date ON goal_logs(user_id, period_date);

-- Bingo items (per-user)
CREATE TABLE bingo_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, position)
);

-- Body stats (per-user)
CREATE TABLE body_stats (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'lbs',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_body_stats_user ON body_stats(user_id, name);

-- Ideas (per-user)
CREATE TABLE ideas (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telegram linking
CREATE TABLE telegram_links (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  chat_id TEXT NOT NULL UNIQUE,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE telegram_link_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
