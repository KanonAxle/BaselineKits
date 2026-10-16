const test = require('node:test');
const assert = require('node:assert/strict');
const { buildKitResponses } = require('../utils/kitResponse');

test('buildKitResponses expands nested kits and calculates prices without changing item metadata', () => {
  const kits = [
    { id: 'root', name: 'Root kit', description: 'Root description' },
    { id: 'person-pack', name: 'Adult Male Pack', person_pack_gender: 'male', person_pack_age: 'adult' },
  ];
  const kitItemRows = [
    {
      id: 'root-product',
      kit_id: 'root',
      product_id: 'water',
      quantity: 2,
      selected_variants: { color: 'Blue' },
      qty_rule: 'per_person',
      products: {
        id: 'water',
        name: 'Water Filter',
        description: 'Portable filter',
        brand: 'Example',
        image_url: null,
        images: ['filter.png'],
        price_cents: 1200,
        weight_grams: 100,
        requires_sizing: false,
        sizes: null,
        colors: null,
      },
    },
    { id: 'root-subkit', kit_id: 'root', sub_kit_id: 'person-pack', quantity: 2, is_person_slot: true },
    {
      id: 'pack-product',
      kit_id: 'person-pack',
      product_id: 'shirt',
      quantity: 1,
      products: {
        id: 'shirt',
        name: 'Mens Shirt',
        price_cents: 2500,
        requires_sizing: true,
      },
    },
  ];

  const [root] = buildKitResponses(kits, kitItemRows);

  assert.equal(root.total_price_cents, 7400);
  assert.deepEqual(root.items[0], {
    type: 'product',
    product_id: 'water',
    name: 'Water Filter',
    description: 'Portable filter',
    brand: 'Example',
    image_url: 'filter.png',
    quantity: 2,
    price_cents: 1200,
    weight_grams: 100,
    requires_sizing: false,
    sizes: [],
    colors: [],
    selected_variants: { color: 'Blue' },
    qty_rule: 'per_person',
  });
  assert.equal(root.items[1].type, 'kit');
  assert.equal(root.items[1].person_pack_gender, 'male');
  assert.equal(root.items[1].person_pack_age, 'adult');
  assert.equal(root.items[1].is_person_slot, true);
  assert.equal(root.items[1].total_price_cents, undefined);
  assert.equal(root.items[1].price_cents, 2500);
  assert.equal(root.items[1].items[0].product_id, 'shirt');
});

test('buildKitResponses preserves the depth limit for cyclic kit references', () => {
  const kits = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const kitItemRows = [
    { id: 'a-to-b', kit_id: 'a', sub_kit_id: 'b', quantity: 1 },
    { id: 'b-to-a', kit_id: 'b', sub_kit_id: 'a', quantity: 1 },
  ];

  const [root] = buildKitResponses(kits, kitItemRows);

  assert.deepEqual(root.items[0].items[0].items[0].items, []);
});
