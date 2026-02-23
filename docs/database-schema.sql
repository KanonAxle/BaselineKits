-- TABLE 1: Users (stores customer information)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: Products (individual items like "Water Bottle", "First Aid Kit")
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  weight_grams INTEGER,
  size TEXT,
  image_url TEXT,
  in_stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 3: Kits (bundles like "3-Day Hiking Kit" that contain multiple products)
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_bag_id UUID REFERENCES products(id),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 4: Kit Items (connects kits to products - "3-Day Kit contains 2x Water Bottles")
CREATE TABLE kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER DEFAULT 1
);

-- TABLE 5: Q&A Questions (the questions users see: "What is your use case?")
CREATE TABLE qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 6: Q&A Answers (the answer options: "Solo Hiking", "Family Camping")
CREATE TABLE qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  result_kit_id UUID REFERENCES kits(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  quantity INTEGER DEFAULT 1
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