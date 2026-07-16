-- Migration: Create vendors table
-- Run this against your database before deploying the vendor management feature.

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
