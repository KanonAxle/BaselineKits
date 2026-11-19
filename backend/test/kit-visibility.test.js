const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const kits = [
  { id: 'public', name: 'Public', is_visible: true },
  { id: 'hidden', name: 'Hidden', is_visible: false },
];
const items = [
  { id: '1', kit_id: 'public', sub_kit_id: 'hidden', quantity: 1 },
  { id: '2', kit_id: 'hidden', product_id: 'water', quantity: 1, products: { id: 'water', name: 'Water', price_cents: 500 } },
];
let answerKit = 'hidden';

const supabase = {
  from(table) {
    let rows = table === 'kits' ? kits : table === 'kit_items' ? items :
      table === 'qa_answers' ? [{ id: 'answer', result_kit_id: answerKit, text: 'Choice', question_id: 'question' }] :
      table === 'qa_questions' ? [{ id: 'question', text: 'Question' }] :
      table === 'users' ? [{ id: 'user', email: 'user@example.com', email_verified_at: '2026-01-01' }] : [];
    let updates;
    const builder = {
      select: () => builder,
      order: () => builder,
      eq: (column, value) => { rows = rows.filter(row => row[column] === value); return builder; },
      in: (column, values) => { rows = rows.filter(row => values.includes(row[column])); return builder; },
      update: value => { updates = value; return builder; },
      range: async (start, end) => ({ data: rows.slice(start, end + 1), error: null }),
      maybeSingle: async () => {
        const row = rows[0] || null;
        if (row && updates) Object.assign(row, updates);
        return { data: row, error: null };
      },
      single: async () => ({ data: rows[0] || null, error: null }),
      then: resolve => resolve({ data: rows, error: null }),
    };
    return builder;
  },
};

const supabasePath = require.resolve('../config/supabase');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: supabase };
const app = express();
app.use(express.json());
app.use('/api', require('../routes/kits'));
app.use('/api', require('../routes/orders'));
app.use('/api', require('../routes/qa'));
const adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
const userToken = jwt.sign({ userId: 'user' }, process.env.JWT_SECRET);

test('visibility applies to public listings, direct links, quiz and checkout, but not nested kits', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, options) => {
    const response = await fetch(base + path, options);
    return { status: response.status, body: await response.json() };
  };
  const json = (body, token) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  try {
    const listing = await request('/kits');
    assert.deepEqual(listing.body.map(kit => kit.id), ['public']);
    assert.equal(listing.body[0].total_price_cents, 500);
    assert.equal(listing.body[0].items[0].name, 'Hidden');
    assert.equal((await request('/kits/hidden')).status, 404);
    assert.equal((await request('/kits/public')).body.total_price_cents, 500);
    assert.equal((await request('/admin/kits')).status, 401);
    const admin = await request('/admin/kits', { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.deepEqual(admin.body.map(kit => kit.id), ['public', 'hidden']);
    assert.equal((await request('/orders/quote-kit', json({ kit_id: 'hidden', person_sizes: [] }))).status, 404);
    assert.equal((await request('/qa/submit', json({ answers: { question: 'answer' } }))).status, 404);
    const directOrder = await request('/orders', json({
      kit_id: 'hidden', shipping_address: 'address', shipping_country: 'US', terms_accepted: true,
    }, userToken));
    assert.equal(directOrder.status, 404);
    const cart = await request('/orders/from-cart', json({
      items: [{ type: 'kit', id: 'hidden', quantity: 1 }],
      shipping_address: 'address', shipping_country: 'US', terms_accepted: true,
    }, userToken));
    assert.equal(cart.status, 400);
    assert.match(cart.body.error, /no longer available/);

    const patch = { ...json({ is_visible: true }, adminToken), method: 'PATCH' };
    assert.equal((await request('/admin/kits/hidden/visibility', { ...patch, headers: { 'Content-Type': 'application/json' } })).status, 401);
    assert.equal((await request('/admin/kits/hidden/visibility', patch)).body.is_visible, true);
    assert.equal((await request('/kits/hidden')).status, 200);
    assert.equal((await request('/orders/quote-kit', json({ kit_id: 'hidden', person_sizes: [] }))).body.merchandise_subtotal_cents, 500);
    assert.equal((await request('/qa/submit', json({ answers: { question: 'answer' } }))).status, 200);
    assert.equal((await request('/admin/kits/hidden/visibility', { ...json({ is_visible: 'false' }, adminToken), method: 'PATCH' })).status, 400);
    assert.equal((await request('/admin/kits/missing/visibility', patch)).status, 404);
    const hide = { ...json({ is_visible: false }, adminToken), method: 'PATCH' };
    assert.equal((await request('/admin/kits/hidden/visibility', hide)).body.is_visible, false);
    assert.equal((await request('/kits/hidden')).status, 404);
  } finally {
    server.close();
  }
});
