const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSmartyUrl } = require('../routes/addressLookup');

test('buildSmartyUrl encodes a real US address lookup request', () => {
  const url = buildSmartyUrl({
    street: '1234 West St',
    city: 'Boise',
    state: 'ID',
    zip: '83702',
    authId: 'demo-id',
    authToken: 'demo-token',
    candidates: 3,
  });

  assert.ok(url.includes('us-street.api.smartystreets.com/street-address'));
  assert.ok(url.includes('auth-id=demo-id'));
  assert.ok(url.includes('auth-token=demo-token'));
  assert.ok(url.includes('street=1234') && url.includes('West') && url.includes('St'));
  assert.ok(url.includes('city=Boise'));
  assert.ok(url.includes('state=ID'));
  assert.ok(url.includes('zipcode=83702'));
  assert.ok(url.includes('candidates=3'));
});
