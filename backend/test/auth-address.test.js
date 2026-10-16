const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeAddressInput,
  buildUserAddressPayload,
  normalizeEmail,
  isValidEmail,
} = require('../routes/auth');

test('normalizeAddressInput accepts object input and preserves postal data', () => {
  const result = normalizeAddressInput({
    street: '123 Main St',
    city: 'Boise',
    state: 'ID',
    zip: '83702'
  });

  assert.deepEqual(result, {
    street: '123 Main St',
    street2: '',
    city: 'Boise',
    state: 'ID',
    zip: '83702',
    country: 'US'
  });
});

test('buildUserAddressPayload keeps billing and mailing addresses keyed correctly', () => {
  const payload = buildUserAddressPayload({
    billing_address: { street: '1 Billing Ave', city: 'Boise', state: 'ID', zip: '83702' },
    mailing_address: { street: '2 Mail St', city: 'Boise', state: 'ID', zip: '83702' },
  });

  assert.equal(payload.billing_address.street, '1 Billing Ave');
  assert.equal(payload.mailing_address.street, '2 Mail St');
  assert.equal(payload.billing_address.country, 'US');
  assert.equal(payload.mailing_address.country, 'US');
});

test('email normalization trims whitespace and lowercases the address', () => {
  assert.equal(normalizeEmail('  User.Name@Example.COM '), 'user.name@example.com');
  assert.equal(isValidEmail(normalizeEmail('  User.Name@Example.COM ')), true);
  assert.equal(isValidEmail('not-an-email'), false);
});
