// Checkout route - creates Stripe payment sessions
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function getUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET).userId;
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// ENDPOINT 1: Create Stripe Checkout Session
// POST /api/checkout
// Requires an authenticated account that owns the order and accepted the Terms.
// -------------------------------------------------------
router.post('/checkout', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'You must be logged in to check out' });

    const { order_id, success_url, cancel_url } = req.body;

    if (!order_id || !success_url || !cancel_url) {
      return res.status(400).json({ error: 'order_id, success_url, and cancel_url are required' });
    }

    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001')
      .split(',').map(origin => origin.trim()).filter(Boolean);
    for (const redirectUrl of [success_url, cancel_url]) {
      try {
        if (!allowedOrigins.includes(new URL(redirectUrl).origin)) {
          return res.status(400).json({ error: 'Checkout redirect URL is not allowed' });
        }
      } catch {
        return res.status(400).json({ error: 'Checkout redirect URL is invalid' });
      }
    }

    // Limit checkout sessions to the authenticated customer's own orders.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.customizations?.terms_accepted !== true || !order.customizations?.terms_accepted_at || !order.customizations?.terms_version) {
      return res.status(400).json({ error: 'Terms acceptance is required before payment' });
    }
    if (order.status !== 'placed' && order.status !== 'pending_payment') {
      return res.status(409).json({ error: 'This order is not available for payment' });
    }

    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    if (customerError || !customer?.email) {
      return res.status(401).json({ error: 'Account email not found. Please log in again.' });
    }

    // Fetch the order items to display in Stripe
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, product_name, unit_price_cents, selected_options, products(id, name, price_cents)')
      .eq('order_id', order_id);
    if (itemsError) {
      console.error('Failed to fetch order items for Stripe checkout:', itemsError);
      return res.status(500).json({ error: 'Failed to prepare order items for payment' });
    }

    const pricedItems = (items || []).map(item => ({
      item,
      name: item.product_name || item.products?.name || 'Product',
      unitPrice: item.unit_price_cents ?? item.products?.price_cents,
    }));
    if (pricedItems.some(({ unitPrice }) => !Number.isSafeInteger(unitPrice) || unitPrice < 0)) {
      return res.status(500).json({ error: 'Order contains invalid item pricing' });
    }

    const itemTotal = pricedItems.reduce((sum, { item, unitPrice }) => sum + unitPrice * item.quantity, 0);
    const lineItems = itemTotal === order.total_cents
      ? pricedItems.filter(({ unitPrice }) => unitPrice > 0).map(({ item, name, unitPrice }) => {
        const options = item.selected_options || {};
        const optionLabels = [
          options.size,
          options.color,
          ...(Array.isArray(options.variants) ? options.variants.map(variant => variant.option) : []),
        ].filter(Boolean);
        return {
          price_data: {
            currency: 'usd',
            product_data: { name: optionLabels.length ? `${name} (${optionLabels.join(', ')})` : name },
            unit_amount: unitPrice
          },
          quantity: item.quantity
        };
      })
      : [];

    if (!lineItems.length) {
      if (!Number.isSafeInteger(order.total_cents) || order.total_cents <= 0) {
        return res.status(400).json({ error: 'Order total must be greater than zero to check out' });
      }
      const orderName = order.customizations?.kit_name || 'Baseline Kit Order';
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: orderName },
          unit_amount: order.total_cents
        },
        quantity: 1
      });
    }

    // Create the Stripe checkout session
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        order_id: order_id,
        user_id: userId,
        terms_version: order.customizations.terms_version,
        terms_accepted_at: order.customizations.terms_accepted_at,
        marketing_opt_in: String(order.customizations.marketing_opt_in === true),
      }
    };
    sessionParams.customer_email = customer.email;

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.status(200).json({
      session_id: session.id,
      url: session.url,
      message: 'Redirect customer to this URL'
    });

  } catch (error) {
    console.error('Checkout error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Server error creating checkout session' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Stripe Webhook (Stripe calls this after payment)
// POST /api/webhooks/stripe
// -------------------------------------------------------
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured');
    return res.status(500).json({ error: 'Stripe webhook is not configured' });
  }

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.order_id;

    if (!orderId) {
      console.error('Stripe checkout session is missing its order ID:', session.id);
      return res.status(400).json({ error: 'Stripe session is missing its order ID' });
    }

    const { error: updateError, data: updatedOrders } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId)
      .select('id');

    if (updateError || !updatedOrders?.length) {
      console.error('Failed to mark paid order from Stripe webhook:', updateError || `Order ${orderId} not found`);
      return res.status(500).json({ error: 'Failed to update order after payment' });
    }

    console.log(`Order ${orderId} marked as paid`);
  }

  res.json({ received: true });
});

module.exports = router;
