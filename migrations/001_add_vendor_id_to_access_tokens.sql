-- Migration: Add vendor_id to access_tokens
-- Run this against your database before deploying the vendor account creation changes.

ALTER TABLE access_tokens ADD COLUMN IF NOT EXISTS vendor_id INTEGER;
