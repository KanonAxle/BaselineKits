const test = require('node:test');
const assert = require('node:assert/strict');
const {
  slugify,
  normalizeCategoryInput,
  normalizeArticleInput,
  normalizeSections,
} = require('../utils/educationContent');

test('slugify produces url-safe slugs', () => {
  assert.equal(slugify('  Water & Purification! '), 'water-purification');
  assert.equal(slugify('Café Rules'), 'cafe-rules');
});

test('category input requires a name and rejects the reserved all id', () => {
  assert.ok(normalizeCategoryInput({ label: '' }, { creating: true }).error);
  assert.ok(normalizeCategoryInput({ label: 'All' }, { creating: true }).error);
  const { value } = normalizeCategoryInput({ label: 'Shelter', blurb: 'Tents' }, { creating: true });
  assert.equal(value.id, 'shelter');
});

test('category update does not change the id', () => {
  const { value } = normalizeCategoryInput({ label: 'Renamed', id: 'x' }, { creating: false });
  assert.equal(value.id, undefined);
});

test('article input validates and normalizes content', () => {
  assert.ok(normalizeArticleInput({ title: 'x' }, { creating: true }).error);
  const { value } = normalizeArticleInput({
    title: 'Hello World',
    category: 'water',
    readMinutes: '500',
    sections: [{ heading: 'H', paragraphs: ['a', ' '], bullets: ['', 'b'] }, { heading: '', paragraphs: [''] }],
    related: ['ok-slug', 'Bad Slug'],
  }, { creating: true });
  assert.equal(value.slug, 'hello-world');
  assert.equal(value.read_minutes, 120);
  assert.deepEqual(value.sections, [{ heading: 'H', paragraphs: ['a'], bullets: ['b'] }]);
  assert.deepEqual(value.related, ['ok-slug']);
});

test('normalizeSections tolerates bad input', () => {
  assert.deepEqual(normalizeSections(null), []);
});
