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

function buildKitResponse(kitId, kitsById, itemsByKitId, depth = 0) {
  const kit = kitsById.get(kitId);
  if (!kit) return null;

  const items = [];
  for (const row of itemsByKitId.get(kitId) || []) {
    if (row.product_id && row.products) {
      items.push(toProductItem(row));
    } else if (row.sub_kit_id && depth < 3) {
      const subKit = buildKitResponse(row.sub_kit_id, kitsById, itemsByKitId, depth + 1);
      if (subKit) {
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
        });
      }
    }
  }

  const total_price_cents = items.reduce(
    (sum, item) => sum + item.price_cents * item.quantity, 0
  );

  return { ...kit, items, total_price_cents };
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

module.exports = { buildKitResponses };
