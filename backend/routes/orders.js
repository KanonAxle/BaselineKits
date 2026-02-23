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

// -------------------------------------------------------
// ENDPOINT 1: Create a New Order
// POST /api/orders
// Requires: logged-in user (Authorization header)
// -------------------------------------------------------
router.post('/orders', async (req, res) => {
  try {
    // Verify the user is logged in
    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to place an order' });
    }

    const { kit_id, customizations, shipping_address } = req.body;

    if (!kit_id || !shipping_address) {
      return res.status(400).json({ error: 'kit_id and shipping_address are required' });
    }

    // Fetch the kit and its items
    const { data: kitItems, error: kitError } = await supabase
      .from('kit_items')
      .select('quantity, products(id, name, price_cents)')
      .eq('kit_id', kit_id);

    if (kitError || !kitItems.length) {
      return res.status(404).json({ error: 'Kit not found or has no items' });
    }

    // Start with all default kit items
    let orderItems = kitItems.map(item => ({
      product_id: item.products.id,
      name: item.products.name,
      quantity: item.quantity,
      price_cents: item.products.price_cents
    }));

    // Apply customizations if provided
    if (customizations) {
      // Remove items the user opted out of
      if (customizations.remove_items && customizations.remove_items.length) {
        orderItems = orderItems.filter(
          item => !customizations.remove_items.includes(item.product_id)
        );
      }

      // Add extra items the user selected
      if (customizations.add_items && customizations.add_items.length) {
        for (const productId of customizations.add_items) {
          const { data: product } = await supabase
            .from('products')
            .select('id, name, price_cents')
            .eq('id', productId)
            .single();

          if (product) {
            orderItems.push({
              product_id: product.id,
              name: product.name,
              quantity: 1,
              price_cents: product.price_cents
            });
          }
        }
      }
    }

    // Calculate total price
    let total_cents = orderItems.reduce(
      (sum, item) => sum + item.price_cents * item.quantity, 0
    );

    // Apply bag size adjustment if selected
    if (customizations && customizations.bag_size) {
      const sizeAdjustments = { S: -0.15, M: 0, L: 0.20, XL: 0.30 };
      const adjustment = sizeAdjustments[customizations.bag_size] || 0;
      total_cents = Math.round(total_cents * (1 + adjustment));
    }

    // Save the order to the database
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: userId,
        kit_id,
        customizations: customizations || {},
        total_cents,
        status: 'placed',
        shipping_address
      }])
      .select();

    if (orderError) {
      return res.status(500).json({ error: 'Failed to create order' });
    }

    const orderId = newOrder[0].id;

    // Save each order item
    const orderItemRows = orderItems.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemRows);

    if (itemsError) {
      return res.status(500).json({ error: 'Order created but failed to save items' });
    }

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
// ENDPOINT 2: Get All Orders for Logged-In User
// GET /api/orders
// -------------------------------------------------------
router.get('/orders', async (req, res) => {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to view orders' });
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, kit_id, status, total_cents, created_at, shipped_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    res.status(200).json(orders);

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error fetching orders' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Get One Order by ID
// GET /api/orders/:id
// -------------------------------------------------------
router.get('/orders/:id', async (req, res) => {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to view an order' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch order items
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
