-- Migration 006: Create discounts table
-- Stores vendor-level discount notices with active time windows.

CREATE TABLE IF NOT EXISTS discounts (
    discount_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT discounts_time_range_check CHECK (end_time > start_time)
);
