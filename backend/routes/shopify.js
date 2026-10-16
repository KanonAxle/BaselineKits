// Shopify Storefront API routes for headless cart checkout.
const express = require('express');
const router = express.Router();

const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07';
const storeUrl = (process.env.SHOPIFY_STORE_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

function getStorefrontEndpoint() {
  if (!storeUrl || !storefrontToken) {
    throw new Error('Shopify Storefront API is not configured');
  }
  return `https://${storeUrl}/api/${apiVersion}/graphql.json`;
}

async function storefrontRequest(query, variables) {
  const response = await fetch(getStorefrontEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Shopify-Storefront-Private-Token': storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(error => error.message).join('; ') || `Shopify request failed (${response.status})`;
    throw new Error(message);
  }
  return payload.data;
}

// POST /api/shopify/cart
// Creates a Shopify cart and returns Shopify's hosted checkout URL.
router.post('/shopify/cart', async (req, res) => {
  try {
    const { items, email } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one cart item is required' });
    }

    const lines = items.map(item => ({
      merchandiseId: item.merchandiseId || item.shopify_variant_id,
      quantity: Number(item.quantity || 1),
    }));

    if (lines.some(line => !line.merchandiseId || !Number.isInteger(line.quantity) || line.quantity < 1)) {
      return res.status(400).json({ error: 'Each item needs a Shopify variant ID and a positive quantity' });
    }

    const variables = { lines };
    if (email) variables.buyerIdentity = { email };

    const data = await storefrontRequest(`
      mutation CreateCart($lines: [CartLineInput!], $buyerIdentity: CartBuyerIdentityInput) {
        cartCreate(input: { lines: $lines, buyerIdentity: $buyerIdentity }) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `, variables);

    const result = data.cartCreate;
    if (result.userErrors?.length) {
      return res.status(400).json({ error: result.userErrors.map(error => error.message).join('; ') });
    }
    if (!result.cart?.checkoutUrl) {
      return res.status(502).json({ error: 'Shopify did not return a checkout URL' });
    }

    res.status(200).json({ cart_id: result.cart.id, checkout_url: result.cart.checkoutUrl });
  } catch (error) {
    console.error('Shopify cart error:', error?.message || error);
    const status = error?.message === 'Shopify Storefront API is not configured' ? 503 : 502;
    res.status(status).json({ error: error?.message || 'Unable to create Shopify checkout' });
  }
});

module.exports = router;
