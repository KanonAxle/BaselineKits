# Shopify Integration - Technical Specification

## Overview
This document outlines the technical approach for integrating Shopify as the backend commerce platform while maintaining the current Next.js frontend.

---

## 1. Authentication & Setup

### Shopify App Configuration
```javascript
// backend/config/shopify.js
module.exports = {
  storeUrl: process.env.SHOPIFY_STORE_URL,
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  apiVersion: '2024-10',
  graphqlEndpoint: `https://${process.env.SHOPIFY_STORE_URL}/api/graphql.json`,
};
```

### Required Scopes (for Admin API)
```
write_products
read_products
write_orders
read_orders
write_fulfillments
read_fulfillments
write_inventory
read_inventory
write_customers
read_customers
```

---

## 2. API Routes to Create

### `POST /api/shopify/products/sync`
Fetches all products from Shopify and caches locally
```javascript
// Endpoint: POST /api/shopify/products/sync
// Purpose: Full sync of Shopify products to local DB
// Response: { synced: 150, timestamp: "2026-09-01T..." }
```

### `GET /api/shopify/products`
Get all products (uses cached data for speed)
```javascript
// Endpoint: GET /api/shopify/products?limit=50&offset=0
// Purpose: Returns products with Shopify metadata
// Response: { products: [...], total: 150 }
```

### `GET /api/shopify/products/:id`
Get single product by Shopify ID
```javascript
// Endpoint: GET /api/shopify/products/:id
// Purpose: Single product details + variants
// Response: { id, name, description, images[], variants[] }
```

### `POST /api/shopify/collections`
Get collections (bundles/kits)
```javascript
// Endpoint: GET /api/shopify/collections
// Purpose: Returns all kits as Shopify collections
// Response: { collections: [...] }
```

### `POST /api/shopify/checkout`
Create Shopify checkout session
```javascript
// Endpoint: POST /api/shopify/checkout
// Body: { lineItems: [...], customer: {...} }
// Response: { checkoutUrl: "https://..." }
```

### `POST /api/shopify/webhook`
Handle Shopify webhooks (orders, inventory)
```javascript
// Endpoint: POST /api/shopify/webhook
// Events: order/create, inventory/update
// Purpose: Keep local cache in sync
```

---

## 3. Frontend Integration Points

### Product Pages
```typescript
// Current: Fetch from /api/products/:id
// New: Fetch from /api/shopify/products/:id
// Visual change: None (same data format)

async function getProduct(id: string) {
  const response = await fetch(`/api/shopify/products/${id}`);
  return response.json();
}
```

### Kit/Collection Pages
```typescript
// Current: Query kits from custom DB
// New: Query Shopify collections

async function getKit(id: string) {
  const response = await fetch(`/api/shopify/collections/${id}`);
  return response.json();
}
```

### Checkout
```typescript
// Current: POST /api/checkout (creates Stripe checkout)
// New: POST /api/shopify/checkout (creates Shopify checkout)

async function initiateCheckout(items: CartItem[], customer: Customer) {
  const response = await fetch(`/api/shopify/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      lineItems: items.map(item => ({
        variantId: item.shopifyVariantId,
        quantity: item.quantity,
      })),
      customer: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        address: customer.address,
      }
    })
  });
  return response.json();
}
```

---

## 4. Data Caching Strategy

### Why Cache?
- Shopify API calls count against rate limits
- Faster page loads
- Fallback if API is down

### Cache Schema
```javascript
// Local cache in Supabase
CREATE TABLE shopify_products_cache (
  id UUID PRIMARY KEY,
  shopify_product_id VARCHAR,
  shopify_product_gid VARCHAR,
  data JSONB,
  last_synced TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE shopify_collections_cache (
  id UUID PRIMARY KEY,
  shopify_collection_id VARCHAR,
  shopify_collection_gid VARCHAR,
  data JSONB,
  last_synced TIMESTAMP,
  created_at TIMESTAMP
);
```

### Cache Invalidation
- **Auto-sync**: Every 6 hours (configurable)
- **Webhook-triggered**: On product/inventory changes
- **Manual**: Admin endpoint `/api/shopify/products/sync`

---

## 5. Order Fulfillment

### Order Flow
```
Customer checks out
    ↓
POST /api/shopify/checkout
    ↓
Shopify creates order
    ↓
Webhook: order/create
    ↓
Check order line items:
  - Internal items → Route to warehouse
  - Faire items → Route to Faire API
    ↓
Update fulfillment status
```

### Order Metadata
```javascript
// Each Shopify order includes:
{
  id: "gid://shopify/Order/...",
  lineItems: [
    {
      variantId: "gid://shopify/ProductVariant/...",
      supplier: "internal", // or "faire"
      sku: "SKU-123"
    }
  ],
  fulfillmentStatus: "PENDING", // or "FULFILLED"
  customer: {...},
  shippingAddress: {...}
}
```

---

## 6. Faire Integration

### Faire Product Sync
```javascript
// POST /api/faire/products/sync
// Fetches Faire products and creates them in Shopify
async function syncFaireProducts() {
  // 1. Fetch from Faire API
  const faireProducts = await faire.getProducts();

  // 2. Create in Shopify
  for (const product of faireProducts) {
    await shopify.createProduct({
      title: product.name,
      vendor: "Faire", // marks as external
      handle: `faire-${product.id}`,
      productType: product.category,
      metafields: [
        {
          key: "supplier",
          value: "faire"
        },
        {
          key: "supplier_sku",
          value: product.id
        }
      ]
    });
  }
}
```

### Order Routing
```javascript
// When fulfilling order, check supplier
if (lineItem.metafields.supplier === "faire") {
  // Send to Faire fulfillment API
  await faire.createFulfillment({
    orderId: order.id,
    items: lineItem
  });
} else {
  // Send to your warehouse
  await warehouse.createShipment({
    orderId: order.id,
    items: lineItem
  });
}
```

---

## 7. Error Handling

### Rate Limits
```javascript
// Shopify: 2 requests/second for API calls
// Implement backoff strategy
async function shopifyApiCall(query, variables) {
  try {
    return await shopify.query(query, variables);
  } catch (error) {
    if (error.statusCode === 429) {
      // Rate limited - wait and retry
      await wait(error.retryAfter || 1000);
      return shopifyApiCall(query, variables);
    }
    throw error;
  }
}
```

### Fallback Logic
```javascript
// If Shopify API fails, use cached data
async function getProduct(id) {
  try {
    const shopifyProduct = await shopify.getProduct(id);
    cache.set(id, shopifyProduct);
    return shopifyProduct;
  } catch (error) {
    const cachedProduct = await cache.get(id);
    if (cachedProduct) return cachedProduct;
    throw error;
  }
}
```

---

## 8. Timeline & Milestones

### Week 1-2: Setup
- [ ] Shopify Partner + Dev Store created
- [ ] API credentials obtained
- [ ] Cache tables created in Supabase

### Week 2-3: Core Integration
- [ ] Shopify product sync working
- [ ] Product pages query Shopify
- [ ] Collections/kits working
- [ ] Cache invalidation implemented

### Week 3-4: Checkout
- [ ] Shopify checkout integration
- [ ] Order webhook handlers
- [ ] Fulfillment routing

### Week 4-5: Testing
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Faire integration testing

### Week 5-6: Launch
- [ ] Soft launch to staging
- [ ] Monitoring
- [ ] Production launch

---

## 9. Monitoring & Logging

### Key Metrics to Track
- Shopify API response times
- Cache hit rate
- Webhook delivery success rate
- Order routing success rate
- Sync error count

### Logging
```javascript
// Log all Shopify interactions
logger.info('SHOPIFY_API_CALL', {
  endpoint: 'products',
  duration: 234,
  statusCode: 200,
  cacheHit: false
});
```

---

## 10. Rollback Plan

### If Migration Fails
1. Revert frontend to use old `/api/products` endpoints
2. Existing Supabase products table still intact
3. Keep Shopify connection as read-only
4. Timeline: < 1 hour

### Automated Fallback
```javascript
// Feature flag to disable Shopify integration
if (process.env.USE_SHOPIFY === 'false') {
  // Use old API endpoints instead
  getProduct = getProductFromDB;
}
```

---

## Questions & Decisions Needed

1. **Checkout**: Shopify Checkout vs. Custom Checkout?
   - Shopify Checkout: Built-in, secure, but less customizable
   - Custom: Full control, but more maintenance

2. **Orders**: How to handle splitting between suppliers?
   - Automatic: System routes automatically (more complex)
   - Manual: Admin approves routing (simpler)

3. **Timeline**: Hard deadline vs. flexible?
   - Affects testing depth and launch strategy
