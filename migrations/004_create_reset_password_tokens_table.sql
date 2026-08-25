CREATE TABLE IF NOT EXISTS public.reset_password_tokens (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    reset_password_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_password_tokens_email ON public.reset_password_tokens (email);
