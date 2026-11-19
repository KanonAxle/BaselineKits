-- Existing and newly created kits remain public until an administrator hides them.
ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
