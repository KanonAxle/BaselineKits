// Kits routes - handles fetching and managing pre-built survival kits
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAdmin = require('../middleware/requireAdmin');
const { buildKitResponse, buildKitResponses } = require('../utils/kitResponse');

const PAGE_SIZE = 1000;
const KIT_ITEM_COLUMNS = 'kit_id, quantity, product_id, sub_kit_id, selected_variants, is_person_slot, qty_rule, products(id, name, description, price_cents, weight_grams, requires_sizing, sizes, colors, image_url, images, brand)';

async function fetchAllRows(table, columns, orderColumns) {
  const rows = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase.from(table).select(columns);
    for (const column of orderColumns) query = query.order(column);

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

// Fetch a kit graph by loading item rows in batches at each nested level.
async function getKitWithItems(kitId) {
  const { data: kit, error: kitError } = await supabase
    .from('kits')
    .select('*')
    .eq('id', kitId)
    .maybeSingle();

  if (kitError) throw kitError;
  if (!kit) return null;

  const kits = [kit];
  const kitIds = new Set([kitId]);
  const kitItems = [];
  let frontier = [kitId];

  for (let depth = 0; depth <= 3 && frontier.length > 0; depth++) {
    let query = supabase
      .from('kit_items')
      .select(KIT_ITEM_COLUMNS)
      .in('kit_id', frontier);
    for (const column of ['kit_id', 'id']) query = query.order(column);

    const { data: rows, error: itemsError } = await query;
    if (itemsError) throw itemsError;
    const page = rows || [];
    kitItems.push(...page);
    if (depth === 3) break;

    const childIds = [...new Set(page
      .map(row => row.sub_kit_id)
      .filter(id => id && !kitIds.has(id)))];
    if (childIds.length === 0) break;

    const { data: childKits, error: childKitsError } = await supabase
      .from('kits')
      .select('*')
      .in('id', childIds);
    if (childKitsError) throw childKitsError;

    for (const childKit of childKits || []) {
      kits.push(childKit);
      kitIds.add(childKit.id);
    }
    frontier = (childKits || []).map(childKit => childKit.id);
  }

  const kitsById = new Map(kits.map(item => [item.id, item]));
  const itemsByKitId = new Map();
  for (const row of kitItems) {
    const rows = itemsByKitId.get(row.kit_id) || [];
    rows.push(row);
    itemsByKitId.set(row.kit_id, rows);
  }

  return buildKitResponse(kitId, kitsById, itemsByKitId);
}

// -------------------------------------------------------
// ENDPOINT 1: Get All Kits
// GET /api/kits
// -------------------------------------------------------
router.get('/kits', async (req, res) => {
  try {
    const [kits, kitItems] = await Promise.all([
      fetchAllRows('kits', '*', ['created_at', 'id']),
      fetchAllRows('kit_items', KIT_ITEM_COLUMNS, ['kit_id', 'id']),
    ]);

    res.status(200).json(buildKitResponses(kits, kitItems));

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
// ENDPOINT 3: Create a Kit (Admin only)
// POST /api/kits
// items: [{ product_id?, sub_kit_id?, quantity }]
// -------------------------------------------------------
router.post('/kits', requireAdmin, async (req, res) => {
  try {
    const { name, description, base_bag_id, image_url, items, person_pack_gender, person_pack_age, collection_id, tag } = req.body;

    if (!name || !items || !items.length) {
      return res.status(400).json({ error: 'Name and items are required' });
    }

    const { data: newKit, error: kitError } = await supabase
      .from('kits')
      .insert([{ name, description, base_bag_id, image_url, person_pack_gender: person_pack_gender || null, person_pack_age: person_pack_age || null, collection_id: collection_id || null, tag: tag || null }])
      .select();

    if (kitError) {
      return res.status(500).json({ error: 'Failed to create kit' });
    }

    const kitItemRows = items.map(item => ({
      kit_id: newKit[0].id,
      product_id: item.product_id || null,
      sub_kit_id: item.sub_kit_id || null,
      quantity: item.quantity,
      selected_variants: item.selected_variants || null,
      is_person_slot: item.is_person_slot || false,
      qty_rule: item.qty_rule || null,
    }));

    const { error: itemsError } = await supabase
      .from('kit_items')
      .insert(kitItemRows);

    if (itemsError) {
      return res.status(500).json({ error: 'Kit created but failed to add items' });
    }

    const fullKit = await getKitWithItems(newKit[0].id);
    res.status(201).json(fullKit);

  } catch (error) {
    console.error('Create kit error:', error);
    res.status(500).json({ error: 'Server error creating kit' });
  }
});

// -------------------------------------------------------
// ENDPOINT 4: Update a Kit (Admin only)
// PUT /api/kits/:id
// -------------------------------------------------------
router.put('/kits/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image_url, items, person_pack_gender, person_pack_age, collection_id, tag } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { error: kitError } = await supabase
      .from('kits')
      .update({ name, description, image_url, person_pack_gender: person_pack_gender || null, person_pack_age: person_pack_age || null, collection_id: collection_id || null, tag: tag || null })
      .eq('id', id);

    if (kitError) return res.status(500).json({ error: 'Failed to update kit' });

    const { error: deleteError } = await supabase
      .from('kit_items')
      .delete()
      .eq('kit_id', id);

    if (deleteError) return res.status(500).json({ error: 'Failed to replace kit items' });

    if (items && items.length) {
      const rows = items.map(item => ({
        kit_id: id,
        product_id: item.product_id || null,
        sub_kit_id: item.sub_kit_id || null,
        quantity: item.quantity,
        selected_variants: item.selected_variants || null,
        is_person_slot: item.is_person_slot || false,
        qty_rule: item.qty_rule || null,
      }));
      const { error: insertError } = await supabase.from('kit_items').insert(rows);
      if (insertError) return res.status(500).json({ error: 'Failed to insert kit items' });
    }

    const fullKit = await getKitWithItems(id);
    res.status(200).json(fullKit);

  } catch (error) {
    console.error('Update kit error:', error);
    res.status(500).json({ error: 'Server error updating kit' });
  }
});

// -------------------------------------------------------
// ENDPOINT 5: Delete a Kit (Admin only)
// DELETE /api/kits/:id
// -------------------------------------------------------
router.delete('/kits/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await supabase.from('kit_items').delete().eq('kit_id', id);

    const { error } = await supabase.from('kits').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Failed to delete kit' });

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Delete kit error:', error);
    res.status(500).json({ error: 'Server error deleting kit' });
  }
});

// -------------------------------------------------------
// Kit Collections CRUD (Admin only)
// -------------------------------------------------------
router.get('/admin/kits/collections', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('kit_collections').select('*').order('name');
  if (error) return res.status(500).json({ error: 'Failed to fetch collections' });
  res.json(data);
});

router.post('/admin/kits/collections', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const { data, error } = await supabase.from('kit_collections').insert([{ name: name.trim() }]).select().single();
  if (error) return res.status(500).json({ error: 'Failed to create collection' });
  res.status(201).json(data);
});

router.put('/admin/kits/collections/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const { data, error } = await supabase.from('kit_collections').update({ name: name.trim() }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: 'Failed to update collection' });
  res.json(data);
});

router.delete('/admin/kits/collections/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  await supabase.from('kits').update({ collection_id: null }).eq('collection_id', id);
  const { error } = await supabase.from('kit_collections').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Failed to delete collection' });
  res.json({ success: true });
});

module.exports = router;
