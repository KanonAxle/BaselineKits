const MAX_SECTIONS = 30;

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function validSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

function normalizeSections(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_SECTIONS).map(section => ({
    heading: text(section?.heading, 200),
    paragraphs: (Array.isArray(section?.paragraphs) ? section.paragraphs : [])
      .map(paragraph => text(paragraph, 5000))
      .filter(Boolean),
    bullets: (Array.isArray(section?.bullets) ? section.bullets : [])
      .map(bullet => text(bullet, 1000))
      .filter(Boolean),
  })).filter(section => section.heading || section.paragraphs.length || section.bullets.length);
}

// Returns { value } or { error }. Slug/id are only generated or accepted when creating.
function normalizeCategoryInput(body, { creating }) {
  const label = text(body?.label, 80);
  if (!label) return { error: 'Category name is required.' };

  const value = { label, blurb: text(body?.blurb, 300) };
  if (creating) {
    const id = slugify(body?.id || label);
    if (!validSlug(id) || id === 'all') return { error: 'Choose a different category name.' };
    value.id = id;
  }
  return { value };
}

function normalizeArticleInput(body, { creating }) {
  const title = text(body?.title, 200);
  if (!title) return { error: 'Article title is required.' };

  const category = text(body?.category, 80);
  if (!category) return { error: 'Choose a category for this article.' };

  const readMinutes = Number.parseInt(body?.readMinutes, 10);
  const value = {
    title,
    category_id: category,
    summary: text(body?.summary, 500),
    read_minutes: Number.isFinite(readMinutes) ? Math.min(Math.max(readMinutes, 1), 120) : 3,
    our_approach: text(body?.ourApproach, 2000),
    sections: normalizeSections(body?.sections),
    related: (Array.isArray(body?.related) ? body.related : []).filter(validSlug).slice(0, 10),
    published: body?.published !== false,
  };

  if (creating) {
    const slug = slugify(body?.slug || title);
    if (!validSlug(slug)) return { error: 'Choose a different article title.' };
    value.slug = slug;
  }
  return { value };
}

function categoryFromRow(row) {
  return { id: row.id, label: row.label, blurb: row.blurb || '' };
}

function articleFromRow(row) {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category_id,
    summary: row.summary || '',
    readMinutes: row.read_minutes,
    ourApproach: row.our_approach || '',
    sections: Array.isArray(row.sections) ? row.sections : [],
    related: Array.isArray(row.related) ? row.related : [],
    published: row.published !== false,
  };
}

module.exports = {
  slugify,
  validSlug,
  normalizeSections,
  normalizeCategoryInput,
  normalizeArticleInput,
  categoryFromRow,
  articleFromRow,
};
