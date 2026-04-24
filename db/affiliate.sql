-- Affiliation tables for Neon / Postgres (Vercel integration).
-- Run in Neon: Dashboard → SQL Editor → paste → Run.
-- Requires: PostgreSQL 13+ (Neon). gen_random_uuid() uses pgcrypto on some hosts.
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  commission_percent NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS cookie_window_days INT NOT NULL DEFAULT 30;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code TEXT NOT NULL REFERENCES affiliates (code),
  booking_reference TEXT,
  amount NUMERIC,
  activity_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS commission_amount NUMERIC;
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS activity_date DATE;

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate_code ON affiliate_sales (affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_created_at ON affiliate_sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales (status);

-- Click tracking: one row per /r/[code] hit or ?ref=CODE landing.
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code TEXT NOT NULL REFERENCES affiliates (code),
  visitor_id TEXT NOT NULL,
  landing_url TEXT,
  activity_code TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  country TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code_date ON affiliate_clicks (affiliate_code, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_visitor ON affiliate_clicks (visitor_id);

-- Affiliate dashboard sessions (magic-link-style: admin generates a token).
CREATE TABLE IF NOT EXISTS affiliate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code TEXT NOT NULL REFERENCES affiliates (code),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_token ON affiliate_sessions (token);

-- Admin back-office sessions (password-based, ADMIN_PASSWORD env var).
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions (token);
