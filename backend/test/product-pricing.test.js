const test = require('node:test');
const assert = require('node:assert/strict');
const { ProductSelectionError, resolveProductCartItem } = require('../utils/productPricing');

const product = {
  id: 'product-1',
  name: 'Insulated Jacket',
  price_cents: 10000,
  sizes: [
    { label: 'S', price_cents: 9000, colors: [{ name: 'Black', price_cents: 9500 }] },
    { label: 'L', price_cents: 11000, colors: [{ name: 'Coyote', price_cents: 12000 }] },
  ],
  variant_groups: [{
    name: 'Insulation',
    options: [
      { label: 'Standard', price_modifier_cents: 0 },
      { label: 'Heavy', price_modifier_cents: 2500 },
    ],
  }],
};

test('resolves the catalog price and selected options instead of trusting cart price', () => {
  const item = resolveProductCartItem(product, {
    price_cents: 1,
    selectedSize: 'L',
    selectedColor: 'Coyote',
    selectedVariants: [1],
  });

  assert.equal(item.price_cents, 14500);
  assert.deepEqual(item.selected_options, {
    size: 'L',
    color: 'Coyote',
    variants: [{ group: 'Insulation', option: 'Heavy' }],
  });
});

test('uses the first configured choices when legacy cart items omit selections', () => {
  const item = resolveProductCartItem(product, {});
  assert.equal(item.price_cents, 9500);
  assert.deepEqual(item.selected_options, { size: 'S', color: 'Black', variants: [{ group: 'Insulation', option: 'Standard' }] });
});

test('rejects a selection that is no longer in the catalog', () => {
  assert.throws(
    () => resolveProductCartItem(product, { selectedSize: 'XL' }),
    ProductSelectionError
  );
});

test('rejects out-of-stock sizes and colors', () => {
  assert.throws(() => resolveProductCartItem({
    ...product,
    sizes: [{ label: 'S', in_stock: false }],
  }, { selectedSize: 'S' }), error => error instanceof ProductSelectionError && error.status === 409);
});
