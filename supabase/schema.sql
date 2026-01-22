-- Run this in Supabase SQL editor
-- Creates the curated_experiences table for managing activity-to-vibe assignments

CREATE TABLE IF NOT EXISTS curated_experiences (
  experience_id TEXT PRIMARY KEY,
  vibe_id TEXT NOT NULL CHECK (vibe_id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 0,
  custom_title TEXT NULL,
  custom_image TEXT NULL,
  custom_price_label TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups by vibe_id
CREATE INDEX IF NOT EXISTS idx_curated_experiences_vibe_id ON curated_experiences(vibe_id);

-- Index for faster lookups by enabled status
CREATE INDEX IF NOT EXISTS idx_curated_experiences_enabled ON curated_experiences(enabled);

-- Index for sorting (featured + priority)
CREATE INDEX IF NOT EXISTS idx_curated_experiences_featured_priority ON curated_experiences(featured DESC, priority DESC);













