-- Migration 008: Add color to users
-- Adds a "color" column to the users table, used to personalize each user's
-- profile avatar. Must be one of a fixed palette of 16 colors (or NULL if unset).

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.users ADD CONSTRAINT users_color_check CHECK (
    color IS NULL OR color IN (
        '#EF4444', '#F97316', '#F59E0B', '#EAB308',
        '#84CC16', '#22C55E', '#10B981', '#14B8A6',
        '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
        '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E'
    )
);
