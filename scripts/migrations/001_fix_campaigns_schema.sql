-- Migration: Add missing columns to campaigns table
-- Date: 2026-02-25
-- Issue: Campaign creation was failing with "Failed to create campaign" error
-- Root cause: Production database was missing target_audience and updated_at columns

-- Add target_audience column (if not exists)
ALTER TABLE campaigns ADD COLUMN target_audience TEXT;

-- Add updated_at column (if not exists) 
-- Note: SQLite doesn't allow DEFAULT with non-constant values on ALTER TABLE
ALTER TABLE campaigns ADD COLUMN updated_at DATETIME;

-- Verify the fix
PRAGMA table_info(campaigns);
