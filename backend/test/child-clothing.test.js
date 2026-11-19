const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const products = [
  { id: 'water', name: 'Water', price_cents: 1000, in_stock: true },
  { id: 'boys-shirt', name: 'Boys shirt', price_cents: 2000, in_stock: true, requires_sizing: true, sizes: ['S', 'M'] },
  { id: 'girls-shirt', name: 'Girls shirt', price_cents: 2500, in_stock: true, requires_sizing: true, sizes: ['S', 'M'] },
];
const kits = [
  { id: 'family', name: 'Family', is_visible: true },
  { id: 'choice', name: 'Child Clothes', is_visible: false, is_child_clothing_choice: true },
  { id: 'boys', name: 'Boys', is_visible: false, person_pack_age: 'child', person_pack_gender: 'male' },
  { id: 'girls', name: 'Girls', is_visible: false, person_pack_age: 'child', person_pack_gender: 'female' },
];
const rows = [
  { id: '1', kit_id: 'family', sub_kit_id: 'choice', quantity: 2 },
  { id: '2', kit_id: 'family', product_id: 'water', quantity: 1 },
  { id: '3', kit_id: 'choice', sub_kit_id: 'boys', quantity: 1 },
  { id: '4', kit_id: 'choice', sub_kit_id: 'girls', quantity: 1 },
  { id: '5', kit_id: 'boys', product_id: 'boys-shirt', quantity: 1 },
  { id: '6', kit_id: 'girls', product_id: 'girls-shirt', quantity: 1 },
].map(row => ({ ...row, products: products.find(product => product.id === row.product_id) || null }));
const saved = { orders: [], order_items: [] };
const tables = {
  kits, products, kit_items: rows,
  users: [{ id: 'user', email: 'user@example.com', email_verified_at: '2026-01-01' }],
  qa_answers: [{ id: 'answer', result_kit_id: 'family', question_id: 'question', text: 'Family' }],
  qa_questions: [{ id: 'question', text: 'Household' }],
  orders: saved.orders, order_items: saved.order_items,
};
const fake = {
  from(table) {
    let data = tables[table] || [];
    let inserted = null;
    const builder = {
      select: () => builder,
      order: () => builder,
      eq: (field, value) => { data = data.filter(row => row[field] === value); return builder; },
      in: (field, values) => { data = data.filter(row => values.includes(row[field])); return builder; },
      insert: values => {
        inserted = values.map(value => ({ ...value, ...(table === 'orders' ? { id: 'order-1' } : {}) }));
        tables[table].push(...inserted);
        data = inserted;
        return builder;
      },
      range: async (start, end) => ({ data: data.slice(start, end + 1), error: null }),
      maybeSingle: async () => ({ data: data[0] || null, error: null }),
      single: async () => ({ data: data[0] || null, error: null }),
      then: resolve => resolve({ data: inserted || data, error: null }),
    };
    return builder;
  },
};

const supabasePath = require.resolve('../config/supabase');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fake };
const app = express();
app.use(express.json());
app.use('/api', require('../routes/kits'));
app.use('/api', require('../routes/orders'));
app.use('/api', require('../routes/qa'));
const token = jwt.sign({ userId: 'user' }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);

test('choice packs show starting prices, quote real selections, and persist fulfillment details', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, body, auth = false) => {
    const response = await fetch(base + path, body === undefined ? undefined : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const person = (i, gender, size = 'S') => ({
    label: `Child ${i}`, gender,
    sizes: { [gender === 'male' ? 'boys-shirt' : 'girls-shirt']: { size } },
  });
  const quote = people => request('/orders/quote-kit', { kit_id: 'family', person_sizes: people });
  try {
    const list = await request('/kits');
    assert.equal(list.status, 200);
    assert.equal(list.body[0].total_price_cents, 5000);
    assert.equal(list.body[0].child_clothing_count, 2);
    assert.equal(list.body[0].has_choice_price, true);
    assert.equal((await quote([person(1, 'male'), person(2, 'male')])).body.merchandise_subtotal_cents, 5000);
    assert.equal((await quote([person(1, 'male'), person(2, 'female')])).body.merchandise_subtotal_cents, 5500);
    assert.equal((await quote([person(1, 'female'), person(2, 'female')])).body.merchandise_subtotal_cents, 6000);
    assert.equal((await quote([person(1, 'male')])).status, 400);
    assert.equal((await quote([person(1, 'male'), person(2, 'female', '')])).status, 400);
    assert.equal((await quote([person(1, 'male'), { label: 'Child 2', gender: '', sizes: {} }])).status, 400);
    assert.equal((await quote([person(1, 'male'), person(2, 'female'), person(3, 'male')])).status, 400);
    const recommendation = await request('/qa/submit', { answers: { question: 'answer' } });
    assert.equal(recommendation.status, 200);
    const choice = recommendation.body.recommended_kit.items.find(item => item.type === 'child_clothing_choice');
    assert.equal(choice.quantity, 2);
    assert.equal(choice.price_cents, 2000);
    assert.equal(recommendation.body.recommended_kit.total_price_cents, 5000);
    const order = await request('/orders/from-cart', {
      items: [{ type: 'kit', id: 'family', quantity: 1, price_cents: 5500, personSizes: [person(1, 'male', 'M'), person(2, 'female', 'S')] }],
      shipping_address: 'Address', shipping_country: 'US', terms_accepted: true,
    }, true);
    assert.equal(order.status, 201);
    assert.equal(order.body.merchandise_subtotal_cents, 5500);
    assert.deepEqual(saved.order_items.find(item => item.product_id === 'boys-shirt').selected_options,
      { size: 'M', person: 'Child 1', clothing_choice: 'male' });
    assert.deepEqual(saved.order_items.find(item => item.product_id === 'girls-shirt').selected_options,
      { size: 'S', person: 'Child 2', clothing_choice: 'female' });
    const stale = await request('/orders/from-cart', {
      items: [{ type: 'kit', id: 'family', price_cents: 5000, personSizes: [person(1, 'male'), person(2, 'female')] }],
      shipping_address: 'Address', shipping_country: 'US', terms_accepted: true,
    }, true);
    assert.equal(stale.status, 409);
    const sameChoice = await request('/orders/from-cart', {
      items: [{ type: 'kit', id: 'family', quantity: 2, price_cents: 5000, personSizes: [person(1, 'male', 'S'), person(2, 'male', 'M')] }],
      shipping_address: 'Address', shipping_country: 'US', terms_accepted: true,
    }, true);
    assert.equal(sameChoice.status, 201);
    assert.equal(sameChoice.body.merchandise_subtotal_cents, 10000);
    const shirts = sameChoice.body.items.filter(item => item.product_id === 'boys-shirt');
    assert.deepEqual(shirts.map(item => [item.quantity, item.selected_options.size]), [[2, 'S'], [2, 'M']]);
    const invalid = await request('/orders/from-cart', {
      items: [{ type: 'kit', id: 'family', personSizes: [] }],
      shipping_address: 'Address', shipping_country: 'US', terms_accepted: true,
    }, true);
    assert.equal(invalid.status, 400);
    const invalidChoice = await fetch(`${base}/kits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Bad choice', is_child_clothing_choice: true, items: [{ sub_kit_id: 'boys', quantity: 1 }] }),
    });
    assert.equal(invalidChoice.status, 400);
    const changedOption = await fetch(`${base}/kits/boys`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Boys', person_pack_age: 'adult', person_pack_gender: 'male', items: [{ product_id: 'boys-shirt', quantity: 1 }] }),
    });
    assert.equal(changedOption.status, 409);
  } finally {
    server.close();
  }
});
