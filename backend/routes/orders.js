// Orders routes - handles creating and viewing customer orders
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// HELPER: Verify JWT token and return userId (or null if invalid)
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

// HELPER: Build order items from kit + customizations
async function buildOrderItems(kit_id, customizations) {
  const { data: kitItems, error } = await supabase
    .from('kit_items')
    .select('quantity, products(id, name, price_cents)')
    .eq('kit_id', kit_id);

  if (error || !kitItems.length) return null;

  let orderItems = kitItems.map(item => ({
    product_id: item.products.id,
    name: item.products.name,
    quantity: item.quantity,
    price_cents: item.products.price_cents
  }));

  if (customizations) {
    if (customizations.remove_items?.length) {
      orderItems = orderItems.filter(
        item => !customizations.remove_items.includes(item.product_id)
      );
    }
    if (customizations.add_items?.length) {
      for (const productId of customizations.add_items) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, price_cents')
          .eq('id', productId)
          .single();
        if (product) {
          orderItems.push({ product_id: product.id, name: product.name, quantity: 1, price_cents: product.price_cents });
        }
      }
    }
  }

  let total_cents = orderItems.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  if (customizations?.bag_size) {
    const adj = { S: -0.15, M: 0, L: 0.20, XL: 0.30 }[customizations.bag_size] || 0;
    total_cents = Math.round(total_cents * (1 + adj));
  }

  return { orderItems, total_cents };
}

// -------------------------------------------------------
// ENDPOINT 1: Create a New Order (guest or logged-in)
// POST /api/orders
// Logged-in users: send Authorization header
// Guests: send { guest_email } in body
// -------------------------------------------------------
router.post('/orders', async (req, res) => {
  try {
    const userId = verifyToken(req);
    const { kit_id, customizations, shipping_address, guest_email } = req.body;

    // Must have either a logged-in account or a guest email
    if (!userId && !guest_email) {
      return res.status(400).json({ error: 'Please provide an email address to continue as a guest.' });
    }
    if (!kit_id || !shipping_address) {
      return res.status(400).json({ error: 'kit_id and shipping_address are required' });
    }

    const built = await buildOrderItems(kit_id, customizations);
    if (!built) return res.status(404).json({ error: 'Kit not found or has no items' });

    const { orderItems, total_cents } = built;

    // Store guest email inside customizations JSONB so we don't need a schema change
    const storedCustomizations = {
      ...(customizations || {}),
      ...(guest_email ? { guest_email } : {})
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: userId || null,
        kit_id,
        customizations: storedCustomizations,
        total_cents,
        status: 'placed',
        shipping_address
      }])
      .select();

    if (orderError) return res.status(500).json({ error: 'Failed to create order' });

    const orderId = newOrder[0].id;

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems.map(item => ({ order_id: orderId, product_id: item.product_id, quantity: item.quantity })));

    if (itemsError) return res.status(500).json({ error: 'Order created but failed to save items' });

    res.status(201).json({
      order_id: orderId,
      total_cents,
      items: orderItems,
      message: 'Order created. Proceed to payment.'
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Server error creating order' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Public Order Lookup by Order ID
// GET /api/orders/lookup/:id
// No auth required — anyone with the order ID can check status
// -------------------------------------------------------
router.get('/orders/lookup/:id', async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, total_cents, created_at, shipped_at, kit_id, kits(name)')
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found. Please check your order number and try again.' });
    }

    const statusLabels = {
      placed: 'Order Received — we are preparing your kit.',
      paid: 'Payment Confirmed — your kit is being packed.',
      packed: 'Packed — your kit is ready to ship.',
      shipped: 'Shipped — your kit is on its way!',
      delivered: 'Delivered — enjoy your kit!'
    };

    res.status(200).json({
      order_id: order.id,
      kit_name: order.kits?.name || 'Custom Kit',
      status: order.status,
      status_message: statusLabels[order.status] || order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
      shipped_at: order.shipped_at
    });

  } catch (error) {
    console.error('Order lookup error:', error);
    res.status(500).json({ error: 'Server error looking up order' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Get All Orders for Logged-In User
// GET /api/orders
// -------------------------------------------------------
router.get('/orders', async (req, res) => {
  try {
    const userId = verifyToken(req);
    if (!userId) return res.status(401).json({ error: 'You must be logged in to view orders' });

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, kit_id, status, total_cents, created_at, shipped_at, kits(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch orders' });

    res.status(200).json(orders.map(o => ({ ...o, kit_name: o.kits?.name || 'Custom Kit' })));

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error fetching orders' });
  }
});

// -------------------------------------------------------
// ENDPOINT 4: Get One Order by ID (logged-in user only)
// GET /api/orders/:id
// -------------------------------------------------------
router.get('/orders/:id', async (req, res) => {
  try {
    const userId = verifyToken(req);
    if (!userId) return res.status(401).json({ error: 'You must be logged in to view an order' });

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, products(id, name, price_cents)')
      .eq('order_id', order.id);

    res.status(200).json({
      ...order,
      items: items.map(i => ({
        product_id: i.products.id,
        name: i.products.name,
        quantity: i.quantity,
        price_cents: i.products.price_cents
      }))
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Server error fetching order' });
  }
});

module.exports = router;
