# Shopify Migration Guide - BaselineKits

## Status: STARTING MIGRATION
**Start Date**: September 1, 2026
**Target**: Seamless integration with current frontend

---

## Phase 1: Pre-Migration Checklist

### Your Action Items (Required Before Integration Starts)

- [ ] **Create Shopify Partner Account**
  - Go to https://www.shopify.com/partners
  - Sign up with your email
  - Link to your Shopify store (or create development store)

- [ ] **Create Shopify Development Store**
  - Within Partner Dashboard → "Stores" → "Add app or sales channel"
  - Name: `baselinekits-dev` (or similar)
  - Store URL: Will be assigned
  - This is your test environment (free)

- [ ] **Get Shopify API Credentials**
  - Partner Dashboard → Your Store → Admin
  - Settings → Apps and integrations → Develop apps
  - Create app: "BaselineKits Integration"
  - Get these credentials:
    - `SHOPIFY_API_KEY`
    - `SHOPIFY_API_SECRET`
    - `SHOPIFY_STORE_URL` (yourstore.myshopify.com)
    - `SHOPIFY_ACCESS_TOKEN`

- [ ] **Apply for Faire Partner API** (if not done)
  - https://www.faire.com/wholesale
  - Get credentials:
    - `FAIRE_API_KEY`
    - `FAIRE_API_URL`

- [ ] **Prepare Product Data Export**
  - Current products count: ?
  - Current kits count: ?
  - Do you have product images? (URL format: ?)

---

## Current Architecture (For Reference)

### Backend
- **Framework**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT
- **Stripe Integration**: Yes
- **Current Products**: Custom products table
- **Current Kits**: Custom kits table with items array

### Frontend
- **Framework**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Local state + CartContext

### Current API Endpoints
```
POST   /auth/register          - Account creation
POST   /auth/login             - Login
POST   /auth/profile           - Update profile
GET    /api/products           - Get all products
GET    /api/products/:id       - Get single product
POST   /api/kits               - Get kit recommendations
POST   /api/orders             - Create order
POST   /api/checkout           - Create Stripe checkout
POST   /api/address/google/autocomplete - Google address suggestions
POST   /api/address/google/details     - Google address details
```

---

## Phase 2: Integration Architecture

### What Stays the Same
- ✅ Next.js frontend (no customer-facing changes)
- ✅ Quiz/recommendation engine
- ✅ Checkout flow (visual experience)
- ✅ Google address autocomplete
- ✅ Account system (will migrate to Shopify)

### What Changes
- 🔄 Products → Query from Shopify API instead of custom DB
- 🔄 Kits → Shopify collections/bundles
- 🔄 Orders → Shopify order management
- 🔄 Admin → Move to Shopify Admin

### New Integration Points
```
Next.js Frontend
       ↓
   Shopify Storefront API (for product data)
       ↓
   Shopify Admin API (for orders, inventory)
       ↓
   Faire API (for third-party products)
       ↓
   Shopify Fulfillment API (for order routing)
```

---

## Phase 3: Migration Steps

### Step 1: Set Up Shopify (You do this)
1. Create Partner + Dev Store accounts
2. Provide API credentials to developer
3. Create 2-3 test products in Shopify Admin

### Step 2: API Integration Layer (Developer builds)
1. `backend/routes/shopify.js` - API client + auth
2. `backend/config/shopify.js` - Configuration
3. Webhook handlers for inventory/order updates
4. Product sync from Shopify → local cache

### Step 3: Frontend Updates (Developer builds)
1. Update product queries to use Shopify API
2. Update kit/bundle queries
3. Integrate Shopify Checkout (or keep custom checkout)
4. Update account pages

### Step 4: Testing
1. Test product display
2. Test kit customization
3. Test checkout flow
4. Test order creation

### Step 5: Migration
1. Export current products → Shopify
2. Test with live data
3. Soft launch
4. Monitor

---

## Environment Variables Needed

Add to your `.env.local` and `.env`:

```env
# Shopify
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_token
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret

# Faire (existing)
FAIRE_API_KEY=your_key
FAIRE_API_URL=https://api.faire.com

# Existing
GOOGLE_MAPS_API_KEY=existing
STRIPE_SECRET_KEY=existing
JWT_SECRET=existing
SUPABASE_URL=existing
SUPABASE_ANON_KEY=existing
```

---

## Product Migration Data Mapping

### Current Product Schema → Shopify
```
{
  id                    → gid://shopify/Product/{id}
  name                  → title
  description           → descriptionHtml
  price_cents           → variants[0].price
  images                → media[].src
  category              → tags
  brand                 → vendor
  in_stock              → variants[0].available
  requires_sizing       → metafield: requires_sizing
  supplier              → metafield: supplier (internal/faire)
  supplier_sku          → metafield: supplier_sku
}
```

---

## Kit/Bundle Mapping

### Current Kit Structure → Shopify Bundle
```
{
  id                    → Collection ID
  name                  → Collection title
  description           → Collection description
  items: [...]          → Collection products (via Shopify Bundles app)
  recommended_for: []   → Metafield: quiz_recommendations
}
```

---

## Rollback Plan

**If anything goes wrong:**
1. Full backup exists in: `/backup-pre-shopify/`
2. Database: Existing Supabase is still intact
3. Timeline: Can revert to current setup in < 1 hour
4. Zero customer impact (all in dev/testing)

---

## Success Metrics

When migration is complete:
- ✅ All products visible in storefront
- ✅ All kits/bundles functional
- ✅ Quiz still recommends kits
- ✅ Checkout works end-to-end
- ✅ Orders appear in Shopify
- ✅ Customers see zero difference

---

## Next Steps

1. **You**: Set up Shopify Partner + Dev Store
2. **You**: Provide API credentials
3. **Developer**: Begin Phase 2 integration
4. **Both**: Weekly check-ins on progress

**Questions before we start?**
- Shopify plan preference?
- Timeline for full migration?
- Faire product count estimate?
