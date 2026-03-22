-- Affiliation tables for Neon / Postgres (Vercel integration).
-- Run in Neon: Dashboard → SQL Editor → paste → Run.
-- Requires: PostgreSQL 13+ (Neon). gen_random_uuid() uses pgcrypto on some hosts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  commission_percent NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code TEXT NOT NULL REFERENCES affiliates (code),
  booking_reference TEXT,
  amount NUMERIC,
  activity_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate_code ON affiliate_sales (affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_created_at ON affiliate_sales (created_at DESC);
