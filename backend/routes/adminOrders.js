const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No auth token' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/admin/orders — list all orders newest first
router.get('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, kits(name)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Failed to fetch orders' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/orders/:id — single order with items
router.get('/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, kits(name), order_items(quantity, product_name, unit_price_cents, selected_options, products(name, price_cents))')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/orders — create phone order + Stripe checkout session
router.post('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, kit_id, shipping_address, notes } = req.body;

    if (!customer_name || !customer_email || !kit_id || !shipping_address) {
      return res.status(400).json({ error: 'customer_name, customer_email, kit_id, and shipping_address are required' });
    }

    // Fetch kit
    const { data: kit, error: kitError } = await supabase
      .from('kits').select('id, name').eq('id', kit_id).single();
    if (kitError || !kit) return res.status(404).json({ error: 'Kit not found' });

    // Fetch kit items with products
    const { data: kitItems, error: kitItemsError } = await supabase
      .from('kit_items')
      .select('quantity, products(id, name, price_cents)')
      .eq('kit_id', kit_id);
    if (kitItemsError) return res.status(500).json({ error: 'Failed to fetch kit items' });

    const productItems = (kitItems || []).filter(item => item.products);
    const total_cents = productItems.reduce((sum, item) =>
      sum + (item.products.price_cents * (item.quantity || 1)), 0);

    // Create order in DB
    const customizations = {
      guest_name: customer_name,
      guest_email: customer_email,
      guest_phone: customer_phone || null,
      phone_order: true,
      notes: notes || null,
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: null,
        kit_id,
        customizations,
        total_cents,
        status: 'pending_payment',
        shipping_address,
      }])
      .select().single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // Insert order items
    if (productItems.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(
        productItems.map(item => ({
          order_id: order.id,
          product_id: item.products.id,
          quantity: item.quantity || 1,
          product_name: item.products.name,
          unit_price_cents: item.products.price_cents,
        }))
      );
      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        return res.status(500).json({ error: 'Order created but failed to save its items' });
      }
    }

    // Build Stripe line items — fall back to kit name + total if no products
    const lineItems = productItems.length > 0
      ? productItems.map(item => ({
          price_data: {
            currency: 'usd',
            product_data: { name: item.products.name },
            unit_amount: item.products.price_cents,
          },
          quantity: item.quantity || 1,
        }))
      : [{
          price_data: {
            currency: 'usd',
            product_data: { name: kit.name },
            unit_amount: total_cents || 100,
          },
          quantity: 1,
        }];

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Stripe checkout sessions expire max 24 hours
    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer_email,
      expires_at: expiresAt,
      success_url: `${baseUrl}/track?order=${order.id}`,
      cancel_url: `${baseUrl}/`,
      metadata: { order_id: order.id },
    });

    // Store payment URL back into order customizations
    await supabase.from('orders').update({
      customizations: { ...customizations, payment_url: session.url, stripe_session_id: session.id },
    }).eq('id', order.id);

    res.status(201).json({
      order_id: order.id,
      payment_url: session.url,
      total_cents,
      expires_at: new Date(expiresAt * 1000).toISOString(),
    });

  } catch (err) {
    console.error('Admin order creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// PATCH /api/admin/orders/:id/status — manually update order status
router.patch('/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending_payment', 'placed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const update = { status };
    if (status === 'shipped') update.shipped_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders').update(update).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
