// Checkout route - creates Stripe payment sessions
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// HELPER: Verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// -------------------------------------------------------
// ENDPOINT 1: Create Stripe Checkout Session
// POST /api/checkout
// Requires: logged-in user (Authorization header)
// -------------------------------------------------------
router.post('/checkout', async (req, res) => {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to checkout' });
    }

    const { order_id, success_url, cancel_url } = req.body;

    if (!order_id || !success_url || !cancel_url) {
      return res.status(400).json({ error: 'order_id, success_url, and cancel_url are required' });
    }

    // Fetch the order to confirm it belongs to this user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch the order items to display in Stripe
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, products(id, name, price_cents)')
      .eq('order_id', order_id);

    // Build Stripe line items from order items
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.products.name
        },
        unit_amount: item.products.price_cents
      },
      quantity: item.quantity
    }));

    // Create the Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        order_id: order_id,
        user_id: userId
      }
    });

    res.status(200).json({
      session_id: session.id,
      url: session.url,
      message: 'Redirect customer to this URL'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Server error creating checkout session' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Stripe Webhook (Stripe calls this after payment)
// POST /api/webhooks/stripe
// -------------------------------------------------------
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'placeholder'
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.order_id;

    // Update order status to 'paid'
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId);

    console.log(`Order ${orderId} marked as paid`);
  }

  res.json({ received: true });
});

module.exports = router;
