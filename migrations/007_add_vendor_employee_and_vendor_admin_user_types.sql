-- Migration 007: Add vendor-employee and vendor-admin user types
-- Supports users who are simultaneously vendors and employees/admins,
-- granting them access to both the POS/admin pages and the vendor pages.

ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'vendor-employee';
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'vendor-admin';
