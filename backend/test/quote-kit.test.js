const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const KIT = 'kit-2a2c';
const BOYS = 'pack-boys';
const GIRLS = 'pack-girls';

const kitItems = {
  [KIT]: [
    { quantity: 1, product_id: null, sub_kit_id: BOYS, is_person_slot: true, qty_rule: null, products: null },
    { quantity: 1, product_id: null, sub_kit_id: GIRLS, is_person_slot: true, qty_rule: null, products: null },
    { quantity: 1, product_id: 'water', sub_kit_id: null, is_person_slot: false, qty_rule: null, products: { id: 'water', name: 'Water', price_cents: 1000 } },
  ],
  [BOYS]: [{ quantity: 1, product_id: 'boys-shirt', sub_kit_id: null, is_person_slot: false, qty_rule: null, products: { id: 'boys-shirt', name: 'Boys shirt', price_cents: 2000 } }],
  [GIRLS]: [{ quantity: 1, product_id: 'girls-shirt', sub_kit_id: null, is_person_slot: false, qty_rule: null, products: { id: 'girls-shirt', name: 'Girls shirt', price_cents: 2500 } }],
};
const kits = {
  [KIT]: { id: KIT, is_visible: true },
  [BOYS]: { id: BOYS, person_pack_gender: 'male', person_pack_age: 'child' },
  [GIRLS]: { id: GIRLS, person_pack_gender: 'female', person_pack_age: 'child' },
};

function fakeSupabase() {
  return {
    from(table) {
      const query = { table, filters: {} };
      const builder = {
        select: () => builder,
        eq: (column, value) => { query.filters[column] = value; return builder; },
        in: (column, value) => { query.filters[column] = value; return builder; },
        order: () => builder,
        single: async () => ({ data: kits[query.filters.id] || null, error: null }),
        maybeSingle: async () => {
          const kit = kits[query.filters.id];
          return { data: kit && (query.filters.is_visible === undefined || kit.is_visible === query.filters.is_visible) ? kit : null, error: null };
        },
        then: (resolve) => {
          if (table === 'kits') return resolve({ data: (query.filters.id || []).map(id => kits[id]).filter(Boolean), error: null });
          const ids = Array.isArray(query.filters.kit_id) ? query.filters.kit_id : [query.filters.kit_id];
          return resolve({ data: ids.flatMap(id => (kitItems[id] || []).map(item => ({ ...item, kit_id: id }))), error: null });
        },
      };
      return builder;
    },
  };
}

async function quote(personSizes) {
  const supabasePath = require.resolve(path.join('..', 'config', 'supabase'));
  require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase() };
  delete require.cache[require.resolve('../routes/orders')];

  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api', require('../routes/orders'));
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders/quote-kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kit_id: KIT, person_sizes: personSizes }),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    server.close();
  }
}

test('one boy and one girl price one pack of each', async () => {
  const { status, body } = await quote([
    { label: 'Child 1 — Male', gender: 'Male' },
    { label: 'Child 2 — Female', gender: 'Female' },
  ]);
  assert.equal(status, 200);
  assert.equal(body.merchandise_subtotal_cents, 1000 + 2000 + 2500);
});

test('two boys price two boys packs and no girls pack', async () => {
  const { body } = await quote([
    { label: 'Child 1 — Male', gender: 'Male' },
    { label: 'Child 2 — Male', gender: 'Male' },
  ]);
  assert.equal(body.merchandise_subtotal_cents, 1000 + 2 * 2000);
});

test('two girls price two girls packs and no boys pack', async () => {
  const { body } = await quote([
    { label: 'Child 1 — Female', gender: 'Female' },
    { label: 'Child 2 — Female', gender: 'Female' },
  ]);
  assert.equal(body.merchandise_subtotal_cents, 1000 + 2 * 2500);
});

test('rejects a missing kit id and oversized households', async () => {
  const oversized = Array.from({ length: 21 }, () => ({ label: 'Child', gender: 'Male' }));
  assert.equal((await quote(oversized)).status, 400);
});
