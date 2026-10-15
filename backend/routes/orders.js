// Orders routes - handles creating and viewing customer orders
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const { ProductSelectionError, resolveProductCartItem } = require('../utils/productPricing');
const TERMS_VERSION = '2026-10-12-draft';

async function getCheckoutCustomer(req) {
  const userId = verifyToken(req);
  if (!userId) return { error: 'You must be logged in to place an order', status: 401 };

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .single();

  if (error || !user) return { error: 'Account not found. Please log in again.', status: 401 };
  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    return { error: 'A valid email address is required on your account to place an order.', status: 400 };
  }
  return { user };
}

function buildConsentMetadata(termsAccepted, marketingOptIn) {
  const acceptedAt = new Date().toISOString();
  return {
    terms_accepted: termsAccepted,
    terms_version: TERMS_VERSION,
    terms_accepted_at: acceptedAt,
    marketing_opt_in: marketingOptIn === true,
    marketing_opt_in_at: marketingOptIn === true ? acceptedAt : null,
  };
}

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

// HELPER: Count persons in personSizes matching a pack's age group and gender
function countPersonsByPack(personSizes, packAge, packGender) {
  return (personSizes || []).filter(p => {
    const isChild = p.label.startsWith('Child');
    const ageMatches = packAge === 'child' ? isChild : !isChild;
    const genderMatches = !packGender || (p.gender || '').toLowerCase() === packGender.toLowerCase();
    return ageMatches && genderMatches;
  }).length;
}

// HELPER: Compute item quantity from qty_rule and personSizes
function computeQtyRule(rule, personSizes) {
  if (!personSizes || !personSizes.length) return 0;
  const adults   = personSizes.filter(p => !p.label.startsWith('Child'));
  const children = personSizes.filter(p =>  p.label.startsWith('Child'));
  switch (rule) {
    case 'per_person':       return personSizes.length;
    case 'per_adult':        return adults.length;
    case 'per_child':        return children.length;
    case 'per_adult_male':   return adults.filter(p   => (p.gender||'').toLowerCase() === 'male').length;
    case 'per_adult_female': return adults.filter(p   => (p.gender||'').toLowerCase() === 'female').length;
    case 'per_child_male':   return children.filter(p => (p.gender||'').toLowerCase() === 'male').length;
    case 'per_child_female': return children.filter(p => (p.gender||'').toLowerCase() === 'female').length;
    default: return 0;
  }
}

// HELPER: Recursively resolve all order items for a kit, applying person slots and qty_rules
async function resolveKitItemsForOrder(kit_id, customizations, personSizes, depth = 0) {
  if (depth > 3) return [];

  const { data: kitItems, error } = await supabase
    .from('kit_items')
    .select('quantity, product_id, sub_kit_id, is_person_slot, qty_rule, products(id, name, price_cents)')
    .eq('kit_id', kit_id);

  if (error || !kitItems) return [];

  const result = [];

  for (const row of kitItems) {
    if (row.product_id && row.products) {
      // Product item — fixed or qty_rule based
      const qty = row.qty_rule
        ? computeQtyRule(row.qty_rule, personSizes)
        : row.quantity;
      if (qty > 0) {
        result.push({ product_id: row.products.id, name: row.products.name, quantity: qty, price_cents: row.products.price_cents });
      }
    } else if (row.sub_kit_id) {
      const { data: subKit } = await supabase
        .from('kits')
        .select('person_pack_gender, person_pack_age')
        .eq('id', row.sub_kit_id)
        .single();
      const isPersonSlot = row.is_person_slot || Boolean(subKit?.person_pack_gender || subKit?.person_pack_age);

      if (isPersonSlot && personSizes && personSizes.length > 0) {
        // Person slot — quantity determined by matching persons in sizing
        if (subKit && subKit.person_pack_age) {
          const count = countPersonsByPack(personSizes, subKit.person_pack_age, subKit.person_pack_gender);
          if (count > 0) {
            const subItems = await resolveKitItemsForOrder(row.sub_kit_id, null, null, depth + 1);
            subItems.forEach(item => result.push({ ...item, quantity: item.quantity * count }));
          }
        }
      } else if (!isPersonSlot) {
        // Regular sub-kit — recurse with fixed quantity multiplier
        const subItems = await resolveKitItemsForOrder(row.sub_kit_id, null, null, depth + 1);
        subItems.forEach(item => result.push({ ...item, quantity: item.quantity * row.quantity }));
      }
    }
  }

  // Apply customizations (remove/add items) only at the top level
  if (depth === 0 && customizations) {
    let out = result;
    if (customizations.remove_items?.length) {
      out = out.filter(item => !customizations.remove_items.includes(item.product_id));
    }
    if (customizations.add_items?.length) {
      for (const productId of customizations.add_items) {
        const { data: product } = await supabase.from('products').select('id, name, price_cents').eq('id', productId).single();
        if (product) out.push({ product_id: product.id, name: product.name, quantity: 1, price_cents: product.price_cents });
      }
    }
    return out;
  }

  return result;
}

async function validateAvailableItems(orderItems) {
  const productIds = [...new Set(orderItems.map(item => item.product_id))];
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, in_stock')
    .in('id', productIds);

  if (error) return { error: 'Unable to verify product availability' };

  const productsById = new Map((products || []).map(product => [product.id, product]));
  for (const item of orderItems) {
    const product = productsById.get(item.product_id);
    if (!product) {
      return { error: 'A product in your order is no longer available', status: 400 };
    }
    if (product.in_stock === false || product.in_stock === 0) {
      return { error: `${product.name} is out of stock`, status: 409 };
    }
  }

  return null;
}

// -------------------------------------------------------
// ENDPOINT 1: Create a New Order (logged-in customers only)
// POST /api/orders
// Requires Authorization header and explicit terms acceptance.
// -------------------------------------------------------
router.post('/orders', async (req, res) => {
  try {
    const customerResult = await getCheckoutCustomer(req);
    if (customerResult.error) return res.status(customerResult.status).json({ error: customerResult.error });
    const { user } = customerResult;
    const { kit_id, customizations, shipping_address, phone_number, person_sizes, terms_accepted, marketing_opt_in } = req.body;

    if (terms_accepted !== true) {
      return res.status(400).json({ error: 'You must accept the Terms of Use to place an order.' });
    }
    if (marketing_opt_in !== undefined && typeof marketing_opt_in !== 'boolean') {
      return res.status(400).json({ error: 'Mailing list consent must be true or false.' });
    }
    if (!kit_id || !shipping_address) {
      return res.status(400).json({ error: 'kit_id and shipping_address are required' });
    }

    const orderItems = await resolveKitItemsForOrder(kit_id, customizations, person_sizes || []);
    if (!orderItems.length) return res.status(404).json({ error: 'Kit not found or has no items' });

    const availabilityError = await validateAvailableItems(orderItems);
    if (availabilityError) {
      return res.status(availabilityError.status || 500).json({ error: availabilityError.error });
    }

    let total_cents = orderItems.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

    const storedCustomizations = {
      ...(customizations || {}),
      customer_email: user.email,
      ...buildConsentMetadata(terms_accepted, marketing_opt_in),
      ...(phone_number ? { phone_number } : {})
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id,
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
      .insert(orderItems.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: item.name,
        unit_price_cents: item.price_cents,
        selected_options: item.selected_options || null,
      })));

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
// GET /api/orders/lookup/:id?email=...
// When email is provided, it must match the order's stored email.
// -------------------------------------------------------
router.get('/orders/lookup/:id', async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, total_cents, created_at, shipped_at, kit_id, kits(name), customizations')
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found. Please check your order number and try again.' });
    }

    // If an email was provided, verify it matches what was stored with the order
    const { email } = req.query;
    if (email) {
      const storedEmail = order.customizations?.customer_email || order.customizations?.guest_email;
      if (!storedEmail || storedEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ error: 'Order not found. Please check your email and order number.' });
      }
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
      kit_name: order.kits?.name || 'Custom Order',
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

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, product_name, unit_price_cents, selected_options, products(id, name, price_cents)')
      .eq('order_id', order.id);
    if (itemsError) return res.status(500).json({ error: 'Failed to fetch order items' });

    res.status(200).json({
      ...order,
      items: (items || []).map(i => ({
        product_id: i.products?.id,
        name: i.product_name || i.products?.name || 'Product',
        quantity: i.quantity,
        price_cents: i.unit_price_cents ?? i.products?.price_cents,
        selected_options: i.selected_options || null,
      }))
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Server error fetching order' });
  }
});

// -------------------------------------------------------
// ENDPOINT 5: Create Order from Cart (products + kits; logged-in customers only)
// POST /api/orders/from-cart
// Accepts: { items: CartItem[], shipping_address, terms_accepted, marketing_opt_in }
// Note: requires kit_id to be nullable in the orders table.
// If not: ALTER TABLE orders ALTER COLUMN kit_id DROP NOT NULL;
// -------------------------------------------------------
router.post('/orders/from-cart', async (req, res) => {
  try {
    const customerResult = await getCheckoutCustomer(req);
    if (customerResult.error) return res.status(customerResult.status).json({ error: customerResult.error });
    const { user } = customerResult;
    const { items, shipping_address, phone_number, terms_accepted, marketing_opt_in } = req.body;

    if (terms_accepted !== true) {
      return res.status(400).json({ error: 'You must accept the Terms of Use to place an order.' });
    }
    if (marketing_opt_in !== undefined && typeof marketing_opt_in !== 'boolean') {
      return res.status(400).json({ error: 'Mailing list consent must be true or false.' });
    }
    if (!shipping_address) {
      return res.status(400).json({ error: 'shipping_address is required' });
    }
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Build flat order_items from the mixed cart
    const allOrderItems = [];
    for (const cartItem of items) {
      if (cartItem.type === 'product') {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, price_cents, in_stock, is_visible, sizes, colors, variant_groups')
          .eq('id', cartItem.id)
          .single();
        if (productError || !product || product.is_visible === false) {
          return res.status(400).json({ error: 'A product in your cart is no longer available' });
        }
        if (product.in_stock === false || product.in_stock === 0) {
          return res.status(409).json({ error: `${product.name} is out of stock` });
        }
        const quantity = Number(cartItem.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
          return res.status(400).json({ error: 'Product quantity must be between 1 and 99' });
        }
        try {
          allOrderItems.push({ ...resolveProductCartItem(product, cartItem), quantity });
        } catch (error) {
          if (error instanceof ProductSelectionError) {
            return res.status(error.status).json({ error: error.message });
          }
          throw error;
        }
      } else if (cartItem.type === 'kit') {
        const customizations = {
          bag_size: cartItem.bagSize || 'M',
          remove_items: cartItem.removedItems || [],
          add_items: [],
        };
        const resolved = await resolveKitItemsForOrder(cartItem.id, customizations, cartItem.personSizes || []);
        const multiplier = cartItem.quantity || 1;
        resolved.forEach(item => {
          allOrderItems.push({ ...item, quantity: item.quantity * multiplier });
        });
      }
    }

    if (!allOrderItems.length) {
      return res.status(400).json({ error: 'No valid items found in cart' });
    }

    const availabilityError = await validateAvailableItems(allOrderItems);
    if (availabilityError) {
      return res.status(availabilityError.status || 500).json({ error: availabilityError.error });
    }

    let total_cents = allOrderItems.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

    const storedCustomizations = {
      source: 'cart',
      customer_email: user.email,
      ...buildConsentMetadata(terms_accepted, marketing_opt_in),
      ...(phone_number ? { phone_number } : {}),
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id,
        kit_id: null,
        customizations: storedCustomizations,
        total_cents,
        status: 'placed',
        shipping_address,
      }])
      .select();

    if (orderError) return res.status(500).json({ error: 'Failed to create order' });

    const orderId = newOrder[0].id;

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(allOrderItems.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: item.name,
        unit_price_cents: item.price_cents,
        selected_options: item.selected_options || null,
      })));

    if (itemsError) return res.status(500).json({ error: 'Order created but failed to save items' });

    res.status(201).json({
      order_id: orderId,
      total_cents,
      items: allOrderItems,
      message: 'Order created. Proceed to payment.',
    });

  } catch (error) {
    console.error('Create cart order error:', error);
    res.status(500).json({ error: 'Server error creating order' });
  }
});

module.exports = router;
