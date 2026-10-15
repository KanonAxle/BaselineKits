-- TABLE 1: Users (stores customer information)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  phone_number TEXT,
  billing_address JSONB,
  mailing_address JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: Products (individual items like "Water Bottle", "First Aid Kit")
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  cost_cents INTEGER,
  weight_grams INTEGER,
  size TEXT,
  sizes JSONB,
  image_url TEXT,
  images JSONB,
  colors JSONB,
  variant_groups JSONB,
  brand TEXT,
  country_of_origin TEXT,
  link TEXT,
  image_fit TEXT DEFAULT 'contain',
  in_stock INTEGER DEFAULT 0,
  requires_sizing BOOLEAN DEFAULT false,  -- if true, sizing screen collects per-person sizes at checkout
  is_visible BOOLEAN DEFAULT false,       -- products are private unless explicitly published
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 3: Kits (bundles like "3-Day Hiking Kit" that contain multiple products)
CREATE TABLE kit_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_bag_id UUID REFERENCES products(id),
  description TEXT,
  image_url TEXT,
  collection_id UUID REFERENCES kit_collections(id) ON DELETE SET NULL,
  tag TEXT,
  person_pack_gender TEXT,  -- 'male', 'female', or null — marks this kit as a gender-specific person pack
  person_pack_age TEXT,     -- 'adult', 'child', or null — marks this kit as an age-specific person pack
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 4: Kit Items (connects kits to products OR other kits)
-- product_id is nullable — a row is either a product OR a sub-kit
CREATE TABLE kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  sub_kit_id UUID REFERENCES kits(id),
  quantity INTEGER DEFAULT 1,
  selected_variants JSONB,  -- e.g. {"color": "Coyote Brown", "size": "L"}
  is_person_slot BOOLEAN DEFAULT false,  -- sub-kit items only: quantity resolved from sizing person count
  qty_rule TEXT  -- product items only: null=fixed, 'per_person', 'per_adult', 'per_child',
                 --   'per_adult_male', 'per_adult_female', 'per_child_male', 'per_child_female'
);

-- Migration (run this if kit_items already exists):
-- ALTER TABLE kit_items ADD COLUMN IF NOT EXISTS selected_variants JSONB;
-- ALTER TABLE kits ADD COLUMN IF NOT EXISTS person_pack_gender TEXT;
-- ALTER TABLE kits ADD COLUMN IF NOT EXISTS person_pack_age TEXT;
-- ALTER TABLE kit_items ADD COLUMN IF NOT EXISTS is_person_slot BOOLEAN DEFAULT false;
-- ALTER TABLE kit_items ADD COLUMN IF NOT EXISTS qty_rule TEXT;

-- TABLE 5a: Quiz Paths (admin-only grouping labels for quiz questions)
CREATE TABLE quiz_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 5b: Q&A Questions (the questions users see: "What is your use case?")
CREATE TABLE qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_start BOOLEAN DEFAULT false,   -- the single entry-point question for the quiz
  code TEXT,                        -- short admin reference label (e.g. Q1, INTRO, BUG-OUT-1)
  path_id UUID REFERENCES quiz_paths(id) ON DELETE SET NULL,  -- admin-only grouping
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 6: Q&A Answers (the answer options: "Solo Hiking", "Family Camping")
CREATE TABLE qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  description TEXT,
  result_kit_id UUID REFERENCES kits(id),
  next_question_id UUID REFERENCES qa_questions(id),  -- routes to another question (branching)
  result_contact BOOLEAN DEFAULT false,               -- routes user to Contact Us page
  group_action JSONB,  -- e.g. {"adults": 2, "children": 1, "adult_gender": "Male"}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrations (run these if tables already exist):
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_sizing BOOLEAN DEFAULT false;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT false;

-- Keep newly created products private unless explicitly published.
ALTER TABLE products ALTER COLUMN is_visible SET DEFAULT false;
-- ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS is_start BOOLEAN DEFAULT false;
-- ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS code TEXT;
-- ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS path_id UUID REFERENCES quiz_paths(id) ON DELETE SET NULL;
-- ALTER TABLE qa_answers ADD COLUMN IF NOT EXISTS description TEXT;
-- ALTER TABLE qa_answers ADD COLUMN IF NOT EXISTS next_question_id UUID REFERENCES qa_questions(id);
-- ALTER TABLE qa_answers ADD COLUMN IF NOT EXISTS result_contact BOOLEAN DEFAULT false;
-- ALTER TABLE qa_answers ADD COLUMN IF NOT EXISTS group_action JSONB;

-- TABLE 7: Orders (when a customer purchases a kit)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  kit_id UUID REFERENCES kits(id),
  customizations JSONB,
  total_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'placed',
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shipped_at TIMESTAMP
);

-- TABLE 8: Order Items (which products are in each order)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  product_name TEXT,
  unit_price_cents INTEGER,
  selected_options JSONB
);

-- TABLE 9: Inventory Log (tracks when stock changes)
CREATE TABLE inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  change_quantity INTEGER NOT NULL,
  reason TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster searches
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_kit_items_kit ON kit_items(kit_id);
CREATE INDEX idx_qa_answers_question ON qa_answers(question_id);

-- ── Supabase Storage: Product Images Bucket ────────────────────────────────
-- Run these in the Supabase SQL Editor OR create the bucket manually in
-- Storage > New bucket > Name: "product-images", Public: ON
--
-- 1. Create the public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read (anyone can view images)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 3. Allow service_role to insert/update/delete (backend upload uses service role key)
--    These are covered automatically by the service_role bypass, but if needed:
CREATE POLICY "Service role can manage product images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- ── .env additions required ───────────────────────────────────────────────
-- Add to backend/.env:
--   SUPABASE_SERVICE_KEY=your_service_role_key_here
-- The service role key is in Supabase: Settings > API > service_role (secret)