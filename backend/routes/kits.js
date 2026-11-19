// Kits routes - handles fetching and managing pre-built survival kits
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAdmin = require('../middleware/requireAdmin');
const { buildKitResponses } = require('../utils/kitResponse');
const { getKitWithItems, KIT_ITEM_COLUMNS } = require('../utils/loadKit');

const PAGE_SIZE = 1000;

async function validateChildChoice(isChoice, items, personPackAge, personPackGender) {
  if (!isChoice) return null;
  if (personPackAge || personPackGender || !Array.isArray(items) || items.length !== 2 ||
      items.some(item => !item.sub_kit_id || item.product_id || item.quantity !== 1) ||
      items[0].sub_kit_id === items[1].sub_kit_id) {
    return 'A child clothing choice must contain exactly one boys and one girls child person pack, each with quantity 1.';
  }
  const { data, error } = await supabase.from('kits')
    .select('id, person_pack_age, person_pack_gender, is_child_clothing_choice')
    .in('id', items.map(item => item.sub_kit_id));
  if (error) throw error;
  if (!data || data.length !== 2 || data.some(kit => kit.person_pack_age !== 'child' || kit.is_child_clothing_choice) ||
      !data.some(kit => kit.person_pack_gender === 'male') || !data.some(kit => kit.person_pack_gender === 'female')) {
    return 'Choose one male child person pack and one female child person pack.';
  }
  for (const option of data) {
    const fullKit = await getKitWithItems(option.id);
    if (!fullKit || !fullKit.items.length || fullKit.child_clothing_count) {
      return 'Each child person pack must contain products and cannot contain another child clothing choice.';
    }
  }
  return null;
}

async function validateChildNesting(items, personPackAge, personPackGender) {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    if (!item.sub_kit_id || !(item.is_person_slot || personPackAge || personPackGender)) continue;
    const child = await getKitWithItems(item.sub_kit_id);
    if (child?.child_clothing_count &&
        (personPackAge || personPackGender || !child.is_child_clothing_choice)) {
      return 'Child clothing choices cannot be nested inside a person pack or person slot.';
    }
  }
  return null;
}

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

// -------------------------------------------------------
// ENDPOINT 1: Get All Kits
// GET /api/kits
// -------------------------------------------------------
async function listKits(req, res, includeHidden) {
  try {
    const [kits, kitItems] = await Promise.all([
      fetchAllRows('kits', '*', ['created_at', 'id']),
      fetchAllRows('kit_items', KIT_ITEM_COLUMNS, ['kit_id', 'id']),
    ]);

    const responses = buildKitResponses(kits, kitItems);
    res.status(200).json(includeHidden ? responses : responses.filter(kit => kit.is_visible === true));

  } catch (error) {
    console.error('Get kits error:', error);
    res.status(500).json({ error: 'Server error fetching kits' });
  }
}

router.get('/kits', (req, res) => listKits(req, res, false));
router.get('/admin/kits', requireAdmin, (req, res) => listKits(req, res, true));

// -------------------------------------------------------
// ENDPOINT 2: Get One Kit with All Items
// GET /api/kits/:id
// -------------------------------------------------------
router.get('/kits/:id', async (req, res) => {
  try {
    const kit = await getKitWithItems(req.params.id);

    if (!kit || kit.is_visible !== true) {
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
    const { name, description, base_bag_id, image_url, items, person_pack_gender, person_pack_age, collection_id, tag, is_visible, is_child_clothing_choice } = req.body;

    if (!name || !items || !items.length) {
      return res.status(400).json({ error: 'Name and items are required' });
    }
    if (is_visible !== undefined && typeof is_visible !== 'boolean') {
      return res.status(400).json({ error: 'is_visible must be a boolean' });
    }
    if (is_child_clothing_choice !== undefined && typeof is_child_clothing_choice !== 'boolean') {
      return res.status(400).json({ error: 'is_child_clothing_choice must be a boolean' });
    }
    const choiceError = await validateChildChoice(is_child_clothing_choice, items, person_pack_age, person_pack_gender);
    if (choiceError) return res.status(400).json({ error: choiceError });
    const nestingError = await validateChildNesting(items, person_pack_age, person_pack_gender);
    if (nestingError) return res.status(400).json({ error: nestingError });

    const { data: newKit, error: kitError } = await supabase
      .from('kits')
      .insert([{ name, description, base_bag_id, image_url, person_pack_gender: person_pack_gender || null, person_pack_age: person_pack_age || null, collection_id: collection_id || null, tag: tag || null, is_visible: is_visible === undefined ? true : is_visible, is_child_clothing_choice: is_child_clothing_choice === true }])
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
    const { name, description, image_url, items, person_pack_gender, person_pack_age, collection_id, tag, is_visible, is_child_clothing_choice } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (is_visible !== undefined && typeof is_visible !== 'boolean') {
      return res.status(400).json({ error: 'is_visible must be a boolean' });
    }
    if (is_child_clothing_choice !== undefined && typeof is_child_clothing_choice !== 'boolean') {
      return res.status(400).json({ error: 'is_child_clothing_choice must be a boolean' });
    }
    const { data: current, error: currentError } = await supabase.from('kits')
      .select('is_child_clothing_choice, person_pack_age, person_pack_gender').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return res.status(404).json({ error: 'Kit not found' });
    const isChoice = is_child_clothing_choice === undefined ? current.is_child_clothing_choice : is_child_clothing_choice;
    if ((person_pack_age || null) !== (current.person_pack_age || null) ||
        (person_pack_gender || null) !== (current.person_pack_gender || null) || isChoice ||
        !Array.isArray(items) || items.length === 0) {
      const { data: references, error: referencesError } = await supabase.from('kit_items')
        .select('kit_id').eq('sub_kit_id', id);
      if (referencesError) throw referencesError;
      const parentIds = [...new Set((references || []).map(row => row.kit_id))];
      if (parentIds.length) {
        const { data: parents, error: parentsError } = await supabase.from('kits')
          .select('id').in('id', parentIds).eq('is_child_clothing_choice', true);
        if (parentsError) throw parentsError;
        if (parents?.length) {
          return res.status(409).json({ error: 'This person pack is used by a child clothing choice. Remove it from that choice before changing its age or gender.' });
        }
      }
    }
    const choiceError = await validateChildChoice(isChoice, items, person_pack_age, person_pack_gender);
    if (choiceError) return res.status(400).json({ error: choiceError });
    const nestingError = await validateChildNesting(items, person_pack_age, person_pack_gender);
    if (nestingError) return res.status(400).json({ error: nestingError });

    const { error: kitError } = await supabase
      .from('kits')
      .update({ name, description, image_url, person_pack_gender: person_pack_gender || null, person_pack_age: person_pack_age || null, collection_id: collection_id || null, tag: tag || null, is_child_clothing_choice: isChoice, ...(is_visible === undefined ? {} : { is_visible }) })
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

router.patch('/admin/kits/:id/visibility', requireAdmin, async (req, res) => {
  try {
    if (typeof req.body?.is_visible !== 'boolean') {
      return res.status(400).json({ error: 'is_visible must be a boolean' });
    }
    const { data, error } = await supabase.from('kits')
      .update({ is_visible: req.body.is_visible })
      .eq('id', req.params.id)
      .select('id, is_visible')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Kit not found' });
    res.json(data);
  } catch (error) {
    console.error('Update kit visibility error:', error);
    res.status(500).json({ error: 'Failed to update kit visibility' });
  }
});

// -------------------------------------------------------
// ENDPOINT 5: Delete a Kit (Admin only)
// DELETE /api/kits/:id
// -------------------------------------------------------
router.delete('/kits/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Other kits and quiz answers that point at this kit must be changed by the admin first.
    const [{ data: parents, error: parentsError }, { data: answers, error: answersError }] = await Promise.all([
      supabase.from('kit_items').select('kit_id').eq('sub_kit_id', id),
      supabase.from('qa_answers').select('text').eq('result_kit_id', id),
    ]);
    if (parentsError || answersError) {
      console.error('Delete kit reference check failed:', parentsError || answersError);
      return res.status(500).json({ error: 'Could not check where this kit is used' });
    }

    let parentNames = [];
    if (parents?.length) {
      const { data: parentKits } = await supabase.from('kits').select('name').in('id', [...new Set(parents.map(row => row.kit_id))]);
      parentNames = (parentKits || []).map(kit => kit.name);
    }

    const blockers = [];
    if (parents?.length) blockers.push(`it is included as a sub-kit in: ${parentNames.join(', ') || 'another kit'}`);
    if (answers?.length) blockers.push(`it is the result of ${answers.length} quiz answer(s): ${answers.map(a => `"${a.text}"`).join(', ')}`);
    if (blockers.length) {
      return res.status(409).json({ error: `This kit can't be deleted because ${blockers.join(' and ')}. Remove those references first.` });
    }

    // Past orders keep their line items; they just lose the link to the deleted kit.
    const { error: ordersError } = await supabase.from('orders').update({ kit_id: null }).eq('kit_id', id);
    if (ordersError) {
      console.error('Delete kit order detach failed:', ordersError);
      return res.status(500).json({ error: 'Failed to detach past orders from this kit' });
    }

    const { error: itemsError } = await supabase.from('kit_items').delete().eq('kit_id', id);
    if (itemsError) {
      console.error('Delete kit items failed:', itemsError);
      return res.status(500).json({ error: 'Failed to remove this kit\'s items' });
    }

    const { error } = await supabase.from('kits').delete().eq('id', id);
    if (error) {
      console.error('Delete kit failed:', error);
      return res.status(500).json({ error: `Failed to delete kit: ${error.message}` });
    }

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
