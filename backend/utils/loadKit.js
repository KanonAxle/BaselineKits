const supabase = require('../config/supabase');
const { buildKitResponse } = require('./kitResponse');

const KIT_ITEM_COLUMNS = 'kit_id, quantity, product_id, sub_kit_id, selected_variants, is_person_slot, qty_rule, products(id, name, description, price_cents, weight_grams, requires_sizing, sizes, colors, image_url, images, brand)';

async function getKitWithItems(kitId) {
  const { data: kit, error: kitError } = await supabase.from('kits')
    .select('*').eq('id', kitId).maybeSingle();
  if (kitError) throw kitError;
  if (!kit) return null;

  const kits = [kit];
  const kitIds = new Set([kitId]);
  const kitItems = [];
  let frontier = [kitId];
  for (let depth = 0; depth <= 8 && frontier.length > 0; depth++) {
    let query = supabase.from('kit_items').select(KIT_ITEM_COLUMNS).in('kit_id', frontier);
    for (const column of ['kit_id', 'id']) query = query.order(column);
    const { data: rows, error: itemsError } = await query;
    if (itemsError) throw itemsError;
    const page = rows || [];
    kitItems.push(...page);
    if (depth === 8) break;
    const childIds = [...new Set(page.map(row => row.sub_kit_id).filter(id => id && !kitIds.has(id)))];
    if (!childIds.length) break;
    const { data: children, error } = await supabase.from('kits').select('*').in('id', childIds);
    if (error) throw error;
    for (const child of children || []) {
      kits.push(child);
      kitIds.add(child.id);
    }
    frontier = (children || []).map(child => child.id);
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

module.exports = { getKitWithItems, KIT_ITEM_COLUMNS };
