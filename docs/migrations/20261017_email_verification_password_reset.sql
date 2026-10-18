ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

UPDATE public.users
SET email_verified_at = COALESCE(created_at, now())
WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS public.auth_email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_email_tokens_user_purpose_created_idx
  ON public.auth_email_tokens (user_id, purpose, created_at DESC);

ALTER TABLE public.auth_email_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_email_tokens FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_user_email(p_token_hash TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  verified_user_id UUID;
BEGIN
  UPDATE public.auth_email_tokens
  SET consumed_at = now()
  WHERE token_hash = p_token_hash
    AND purpose = 'email_verification'
    AND sent_at IS NOT NULL
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING user_id INTO verified_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.users
  SET email_verified_at = COALESCE(email_verified_at, now())
  WHERE id = verified_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email verification token refers to a missing user';
  END IF;

  RETURN verified_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_user_password(p_token_hash TEXT, p_password_hash TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reset_user_id UUID;
BEGIN
  UPDATE public.auth_email_tokens
  SET consumed_at = now()
  WHERE token_hash = p_token_hash
    AND purpose = 'password_reset'
    AND sent_at IS NOT NULL
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING user_id INTO reset_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.users
  SET password_hash = p_password_hash
  WHERE id = reset_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Password reset token refers to a missing user';
  END IF;

  RETURN reset_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_user_email(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_user_password(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_user_password(TEXT, TEXT) TO service_role;
