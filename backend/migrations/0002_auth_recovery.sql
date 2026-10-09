ALTER TABLE public.users ADD COLUMN role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
CREATE TABLE public.auth_action_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify-email', 'reset-password')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purpose)
);
CREATE INDEX auth_action_tokens_expiry_idx ON public.auth_action_tokens(expires_at);
CREATE TABLE public.auth_mail_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify-email', 'reset-password', 'password-changed')),
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_mail_outbox_pending_idx ON public.auth_mail_outbox(next_attempt_at);
