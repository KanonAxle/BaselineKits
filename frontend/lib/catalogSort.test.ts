import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { sortCatalog } from './catalogSort.ts';

const products = [
  { name: 'Zebra', price_cents: 500, category: 'food' },
  { name: 'Apple', price_cents: 900, category: 'tools' },
  { name: 'Berry', price_cents: 200, category: 'food' },
];
const price = (item: typeof products[number]) => item.price_cents;
const names = (items: typeof products) => items.map(item => item.name);

test('catalog sorting covers each option without changing the original order', () => {
  assert.deepEqual(names(sortCatalog(products, 'featured', price)), ['Zebra', 'Apple', 'Berry']);
  assert.deepEqual(names(sortCatalog(products, 'price_asc', price)), ['Berry', 'Zebra', 'Apple']);
  assert.deepEqual(names(sortCatalog(products, 'price_desc', price)), ['Apple', 'Zebra', 'Berry']);
  assert.deepEqual(names(sortCatalog(products, 'name_asc', price)), ['Apple', 'Berry', 'Zebra']);
  assert.deepEqual(names(sortCatalog(products, 'name_desc', price)), ['Zebra', 'Berry', 'Apple']);
  assert.deepEqual(names(products), ['Zebra', 'Apple', 'Berry']);
});

test('sorting operates on the filtered products', () => {
  const filtered = products.filter(product => product.category === 'food' && product.name.toLowerCase().includes('e'));
  assert.deepEqual(names(sortCatalog(filtered, 'price_asc', price)), ['Berry', 'Zebra']);
});
