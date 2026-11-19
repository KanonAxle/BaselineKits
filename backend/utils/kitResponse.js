function toProductItem(row) {
  const product = row.products;
  return {
    type: 'product',
    product_id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand || null,
    image_url: product.image_url || (Array.isArray(product.images) ? product.images[0] : null) || null,
    quantity: row.quantity,
    price_cents: product.price_cents,
    weight_grams: product.weight_grams,
    requires_sizing: product.requires_sizing || false,
    sizes: product.sizes || [],
    colors: product.colors || [],
    selected_variants: row.selected_variants || null,
    qty_rule: row.qty_rule || null,
  };
}

function buildKitResponse(kitId, kitsById, itemsByKitId, depth = 0, insideChoice = false) {
  const kit = kitsById.get(kitId);
  if (!kit) return null;
  const choiceBranch = insideChoice || kit.is_child_clothing_choice === true;

  const items = [];
  for (const row of itemsByKitId.get(kitId) || []) {
    if (row.product_id && row.products) {
      items.push(toProductItem(row));
    } else if (row.sub_kit_id && depth < (choiceBranch ? 8 : 3)) {
      const subKit = buildKitResponse(row.sub_kit_id, kitsById, itemsByKitId, depth + 1, choiceBranch);
      if (subKit) {
        if (subKit.child_clothing_count && !subKit.is_child_clothing_choice &&
            (row.is_person_slot || subKit.person_pack_gender || subKit.person_pack_age)) {
          throw new Error(`Child clothing choices cannot be nested inside a person pack: "${subKit.name}".`);
        }
        items.push({
          type: 'kit',
          sub_kit_id: row.sub_kit_id,
          name: subKit.name,
          description: subKit.description,
          quantity: row.quantity,
          price_cents: subKit.total_price_cents,
          item_count: subKit.items.length,
          items: subKit.items,
          is_person_slot: row.is_person_slot || Boolean(subKit.person_pack_gender || subKit.person_pack_age),
          person_pack_gender: subKit.person_pack_gender || null,
          person_pack_age: subKit.person_pack_age || null,
          is_child_clothing_choice: subKit.is_child_clothing_choice || false,
          child_clothing_count: subKit.child_clothing_count,
          has_choice_price: subKit.has_choice_price,
        });
      }
    }
  }

  const isChoice = kit.is_child_clothing_choice === true;
  const options = items.filter(item => item.type === 'kit');
  if (isChoice && (items.length !== 2 || options.length !== 2 ||
    options.some(item => item.quantity !== 1 || item.person_pack_age !== 'child' || !item.items.length) ||
    !options.some(item => item.person_pack_gender === 'male') ||
    !options.some(item => item.person_pack_gender === 'female'))) {
    throw new Error(`Child clothing choice kit "${kit.name}" must contain one boys pack and one girls pack.`);
  }
  const total_price_cents = isChoice
    ? Math.min(...options.map(item => item.price_cents))
    : items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const child_clothing_count = isChoice ? 1 : items.reduce(
    (sum, item) => sum + (item.child_clothing_count || 0) * item.quantity, 0
  );

  return { ...kit, items, total_price_cents, child_clothing_count, has_choice_price: child_clothing_count > 0 };
}

function buildKitResponses(kits, kitItemRows) {
  const kitsById = new Map(kits.map(kit => [kit.id, kit]));
  const itemsByKitId = new Map();

  for (const row of kitItemRows) {
    const rows = itemsByKitId.get(row.kit_id) || [];
    rows.push(row);
    itemsByKitId.set(row.kit_id, rows);
  }

  return kits
    .map(kit => buildKitResponse(kit.id, kitsById, itemsByKitId))
    .filter(Boolean);
}

module.exports = { buildKitResponse, buildKitResponses };
