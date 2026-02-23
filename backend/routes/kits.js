// Kits routes - handles fetching and managing pre-built survival kits
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// HELPER: Fetch all items for a given kit and calculate total price
async function getKitWithItems(kitId) {
  // Fetch the kit row
  const { data: kit, error: kitError } = await supabase
    .from('kits')
    .select('*')
    .eq('id', kitId)
    .single();

  if (kitError || !kit) return null;

  // Fetch the kit_items joined with products to get names and prices
  const { data: kitItems, error: itemsError } = await supabase
    .from('kit_items')
    .select('quantity, products(id, name, price_cents, weight_grams)')
    .eq('kit_id', kitId);

  if (itemsError) return null;

  // Shape the items and calculate the total price
  const items = kitItems.map(item => ({
    product_id: item.products.id,
    name: item.products.name,
    quantity: item.quantity,
    price_cents: item.products.price_cents,
    weight_grams: item.products.weight_grams
  }));

  const total_price_cents = items.reduce(
    (sum, item) => sum + item.price_cents * item.quantity, 0
  );

  return { ...kit, items, total_price_cents };
}

// -------------------------------------------------------
// ENDPOINT 1: Get All Kits
// GET /api/kits
// -------------------------------------------------------
router.get('/kits', async (req, res) => {
  try {
    const { data: kits, error } = await supabase
      .from('kits')
      .select('id');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch kits' });
    }

    // Build full kit details for each kit
    const fullKits = await Promise.all(kits.map(k => getKitWithItems(k.id)));

    res.status(200).json(fullKits.filter(Boolean));

  } catch (error) {
    console.error('Get kits error:', error);
    res.status(500).json({ error: 'Server error fetching kits' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Get One Kit with All Items
// GET /api/kits/:id
// -------------------------------------------------------
router.get('/kits/:id', async (req, res) => {
  try {
    const kit = await getKitWithItems(req.params.id);

    if (!kit) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    res.status(200).json(kit);

  } catch (error) {
    console.error('Get kit error:', error);
    res.status(500).json({ error: 'Server error fetching kit' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Create a Kit (Admin only - TODO: add auth check)
// POST /api/kits
// -------------------------------------------------------
router.post('/kits', async (req, res) => {
  try {
    // TODO: add admin authentication check here
    const { name, description, base_bag_id, image_url, items } = req.body;

    if (!name || !items || !items.length) {
      return res.status(400).json({ error: 'Name and items are required' });
    }

    // Insert the kit row
    const { data: newKit, error: kitError } = await supabase
      .from('kits')
      .insert([{ name, description, base_bag_id, image_url }])
      .select();

    if (kitError) {
      return res.status(500).json({ error: 'Failed to create kit' });
    }

    // Insert each item into kit_items
    const kitItemRows = items.map(item => ({
      kit_id: newKit[0].id,
      product_id: item.product_id,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('kit_items')
      .insert(kitItemRows);

    if (itemsError) {
      return res.status(500).json({ error: 'Kit created but failed to add items' });
    }

    // Return the full kit with items
    const fullKit = await getKitWithItems(newKit[0].id);
    res.status(201).json(fullKit);

  } catch (error) {
    console.error('Create kit error:', error);
    res.status(500).json({ error: 'Server error creating kit' });
  }
});

module.exports = router;
