-- Add fields used by account profiles, kit administration, and price-safe orders.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS mailing_address JSONB;

CREATE TABLE IF NOT EXISTS public.kit_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.kit_collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tag TEXT;

ALTER TABLE public.orders
  ALTER COLUMN kit_id DROP NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS selected_options JSONB;

CREATE INDEX IF NOT EXISTS idx_kits_collection ON public.kits(collection_id);
