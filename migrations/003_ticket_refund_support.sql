-- Migration 003: Ticket refund support
-- Adds 'refunded' column to ticket_items and expands ticket_status allowed values

-- 1. Add refunded flag to ticket_items
ALTER TABLE ticket_items
    ADD COLUMN IF NOT EXISTS refunded BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Expand ticket_status CHECK constraint to allow new statuses.
--    Drop the old constraint (if it exists) and re-add with all four values.
DO $$
BEGIN
    -- Remove the existing check constraint by name if present
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tickets_ticket_status_check'
          AND conrelid = 'tickets'::regclass
    ) THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_ticket_status_check;
    END IF;
END
$$;

ALTER TABLE tickets
    ADD CONSTRAINT tickets_ticket_status_check
    CHECK (ticket_status IN ('open', 'closed', 'partially refunded', 'refunded'));
