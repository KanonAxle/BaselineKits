ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS is_child_clothing_choice boolean NOT NULL DEFAULT false;
