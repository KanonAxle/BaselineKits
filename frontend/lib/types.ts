// Shared domain types for the BaselineKits frontend.
// Shapes mirror the Supabase schema (docs/database-schema.sql) and the
// backend route responses (backend/routes/*).

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type Address = {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  [key: string]: string | undefined;
};

// ─── Users & Auth ──────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  name: string | null;
  phone_number: string | null;
  billing_address: Address | null;
  mailing_address: Address | null;
  created_at: string;
  email_verified_at: string | null;
};

export type AuthResponse = {
  user_id: string;
  token: string;
  message: string;
  // Present on register responses
  email_verification_required?: boolean;
  email_sent?: boolean;
};

export type MessageResponse = { message: string };

// ─── Products ──────────────────────────────────────────────────────────────

export type VariantOption = { label: string; price_modifier_cents?: number | null; [key: string]: unknown };
export type VariantGroup = { name: string; label?: string; options: VariantOption[] | null; [key: string]: unknown };

// A size entry is either a plain string or an object with a label plus
// optional variant pricing and per-size color overrides.
export type ProductSize =
  | string
  | {
      label: string;
      price_cents?: number | null;
      weight_grams?: number | null;
      dimensions?: string | null;
      notes?: string | null;
      in_stock?: boolean | null;
      colors?: ProductColor[];
      [key: string]: unknown;
    };

// A color entry carries a name plus optional hex and variant pricing.
export type ProductColor = {
  name: string;
  hex?: string | null;
  price_cents?: number | null;
  in_stock?: boolean | null;
  [key: string]: unknown;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price_cents: number;
  cost_cents: number | null;
  weight_grams: number | null;
  size: string | null;
  sizes: ProductSize[] | null;
  image_url: string | null;
  images: string[] | null;
  colors: ProductColor[] | null;
  variant_groups: VariantGroup[] | null;
  brand: string | null;
  country_of_origin: string | null;
  link: string | null;
  image_fit: string | null;
  in_stock: number | boolean | null;
  requires_sizing: boolean | null;
  is_visible: boolean | null;
  created_at: string;
};

// Input payload for admin product create/update.
export type ProductInput = Partial<
  Omit<Product, 'id' | 'created_at'>
> & { created_at?: never };

// ─── Kits ──────────────────────────────────────────────────────────────────

export type SelectedVariants = Record<string, string> | null;

export type KitProductItem = {
  type: 'product';
  product_id: string;
  name: string;
  description: string | null;
  brand: string | null;
  image_url: string | null;
  quantity: number;
  price_cents: number;
  weight_grams: number | null;
  requires_sizing: boolean;
  sizes: string[];
  colors: string[];
  selected_variants: SelectedVariants;
  qty_rule: string | null;
};

export type KitSubKitItem = {
  type: 'kit';
  sub_kit_id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_cents: number;
  item_count: number;
  items: KitItem[];
  is_person_slot: boolean;
  person_pack_gender: string | null;
  person_pack_age: string | null;
};

export type KitItem = KitProductItem | KitSubKitItem;

export type Kit = {
  id: string;
  name: string;
  base_bag_id: string | null;
  description: string | null;
  image_url: string | null;
  collection_id: string | null;
  tag: string | null;
  person_pack_gender: string | null;
  person_pack_age: string | null;
  created_at: string;
  items: KitItem[];
  total_price_cents: number;
};

export type KitCollection = {
  id: string;
  name: string;
  created_at: string;
};

export type KitItemInput = {
  product_id?: string | null;
  sub_kit_id?: string | null;
  quantity: number;
  selected_variants?: SelectedVariants;
  is_person_slot?: boolean;
  qty_rule?: string | null;
};

export type KitInput = Partial<
  Omit<Kit, 'id' | 'items' | 'total_price_cents' | 'created_at'>
> & { items?: KitItemInput[]; created_at?: never };

// ─── Quiz (Q&A) ────────────────────────────────────────────────────────────

export type GroupAction = {
  adults?: number;
  children?: number;
  adult_gender?: string;
  [key: string]: Json | undefined;
};

export type Question = {
  id: string;
  text: string;
  position: number;
  is_start: boolean | null;
  code: string | null;
  path_id: string | null;
  created_at: string;
};

export type Answer = {
  id: string;
  question_id: string;
  text: string;
  description: string | null;
  result_kit_id: string | null;
  next_question_id: string | null;
  result_contact: boolean | null;
  group_action: GroupAction | null;
  created_at: string;
};

export type QuestionWithAnswers = Question & { answers: Answer[] };

export type QuizPath = {
  id: string;
  name: string;
  created_at: string;
};

export type AnswerInput = Partial<
  Omit<Answer, 'id' | 'question_id' | 'created_at'>
> & { question_id?: never; created_at?: never };

export type QuestionInput = Partial<
  Omit<Question, 'id' | 'created_at'>
> & { answers?: AnswerInput[]; created_at?: never };

// ─── Orders ────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'placed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  product_name: string | null;
  unit_price_cents: number | null;
  selected_options: Json | null;
};

export type Order = {
  id: string;
  user_id: string | null;
  kit_id: string | null;
  customizations: Json | null;
  total_cents: number;
  status: string;
  shipping_address: string | null;
  created_at: string;
  shipped_at: string | null;
  // Present on admin order list (kits(name) join)
  kits?: { name: string } | null;
  // Present on admin order detail and from-cart orders
  items?: OrderItem[];
};

export type CheckoutResponse = {
  session_id: string;
  url: string;
  message: string;
};

// ─── Education (admin-managed) ─────────────────────────────────────────────
// The backend education routes return camelCase shapes (see
// backend/utils/educationContent.js), not the raw snake_case DB rows.

export type EducationSection = {
  heading: string;
  paragraphs: string[];
  bullets: string[];
};

export type AdminEducationCategory = {
  id: string;
  label: string;
  blurb: string;
};

export type AdminEducationArticle = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  readMinutes: number;
  ourApproach: string;
  sections: EducationSection[];
  related: string[];
  published: boolean;
};

export type EducationCategoryInput = Partial<Omit<AdminEducationCategory, 'id'>>;
// The editor feeds readMinutes from a text input (string) before the backend
// coerces it back to a number.
export type EducationArticleInput = Partial<Omit<AdminEducationArticle, 'slug' | 'readMinutes'>> & {
  slug?: string | null;
  readMinutes?: number | string;
};

// Orders as returned by GET /orders (account order history) — the backend
// joins kits(name) and reshapes order_items.
export type AccountOrderItem = {
  product_id?: string;
  name: string;
  quantity: number;
  price_cents: number | null;
  selected_options: Json | null;
};

export type AccountOrder = Omit<Order, 'items'> & {
  kit_name: string;
  items: AccountOrderItem[];
};

// ─── Misc ──────────────────────────────────────────────────────────────────

export type RecommendationResult = {
  product_id: string;
  score?: number;
  reason?: string;
  [key: string]: Json | undefined;
};

export type GooglePlaceSuggestion = {
  place_id?: string;
  description?: string;
  [key: string]: Json | undefined;
};

export type GooglePlaceDetails = {
  place_id?: string;
  formatted_address?: string;
  [key: string]: Json | undefined;
};
