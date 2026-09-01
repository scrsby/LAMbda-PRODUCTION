-- Migration 009: Add system-admin user type
-- system-admin is identical to admin, but is the only user type (besides
-- vendor-admin) allowed to access the admin user-settings pages
-- (Invites, Users, Vendors).

ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'system-admin';
