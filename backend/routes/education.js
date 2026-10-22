const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAdmin = require('../middleware/requireAdmin');
const {
  validSlug,
  normalizeCategoryInput,
  normalizeArticleInput,
  categoryFromRow,
  articleFromRow,
} = require('../utils/educationContent');

async function loadContent({ includeDrafts }) {
  const [categoriesResult, articlesResult] = await Promise.all([
    supabase.from('education_categories').select('*').order('sort_order').order('label'),
    (() => {
      let query = supabase.from('education_articles').select('*').order('sort_order').order('title');
      if (!includeDrafts) query = query.eq('published', true);
      return query;
    })(),
  ]);
  if (categoriesResult.error) throw categoriesResult.error;
  if (articlesResult.error) throw articlesResult.error;

  return {
    categories: categoriesResult.data.map(categoryFromRow),
    articles: articlesResult.data.map(articleFromRow),
  };
}

async function nextSortOrder(table) {
  const { data, error } = await supabase
    .from(table)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? 0) + 10;
}

function fail(res, label, error) {
  console.error(`${label}:`, error?.message || error);
  res.status(500).json({ error: 'Education content request failed' });
}

async function reorder(table, column, ids) {
  for (let index = 0; index < ids.length; index += 1) {
    const { error } = await supabase.from(table).update({ sort_order: (index + 1) * 10 }).eq(column, ids[index]);
    if (error) throw error;
  }
}

router.get('/education', async (req, res) => {
  try {
    res.json(await loadContent({ includeDrafts: false }));
  } catch (error) {
    fail(res, 'Load education content failed', error);
  }
});

router.get('/admin/education', requireAdmin, async (req, res) => {
  try {
    res.json(await loadContent({ includeDrafts: true }));
  } catch (error) {
    fail(res, 'Load admin education content failed', error);
  }
});

router.post('/admin/education/categories', requireAdmin, async (req, res) => {
  const { value, error: invalid } = normalizeCategoryInput(req.body, { creating: true });
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const { data, error } = await supabase
      .from('education_categories')
      .insert({ ...value, sort_order: await nextSortOrder('education_categories') })
      .select()
      .single();
    if (error?.code === '23505') return res.status(409).json({ error: 'A category with that name already exists.' });
    if (error) throw error;
    res.status(201).json(categoryFromRow(data));
  } catch (error) {
    fail(res, 'Create education category failed', error);
  }
});

router.put('/admin/education/categories-order', requireAdmin, async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.every(validSlug)) return res.status(400).json({ error: 'A list of category ids is required.' });
  try {
    await reorder('education_categories', 'id', ids);
    res.json({ ok: true });
  } catch (error) {
    fail(res, 'Reorder education categories failed', error);
  }
});

router.put('/admin/education/categories/:id', requireAdmin, async (req, res) => {
  const { value, error: invalid } = normalizeCategoryInput(req.body, { creating: false });
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const { data, error } = await supabase
      .from('education_categories')
      .update(value)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Category not found.' });
    res.json(categoryFromRow(data));
  } catch (error) {
    fail(res, 'Update education category failed', error);
  }
});

router.delete('/admin/education/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { count, error: countError } = await supabase
      .from('education_articles')
      .select('slug', { count: 'exact', head: true })
      .eq('category_id', req.params.id);
    if (countError) throw countError;
    if (count > 0) {
      return res.status(409).json({ error: 'Move or delete the articles in this category before deleting it.' });
    }

    const { error } = await supabase.from('education_categories').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    fail(res, 'Delete education category failed', error);
  }
});

router.post('/admin/education/articles', requireAdmin, async (req, res) => {
  const { value, error: invalid } = normalizeArticleInput(req.body, { creating: true });
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const { data, error } = await supabase
      .from('education_articles')
      .insert({ ...value, sort_order: await nextSortOrder('education_articles') })
      .select()
      .single();
    if (error?.code === '23505') return res.status(409).json({ error: 'An article with that title already exists.' });
    if (error?.code === '23503') return res.status(400).json({ error: 'That category no longer exists.' });
    if (error) throw error;
    res.status(201).json(articleFromRow(data));
  } catch (error) {
    fail(res, 'Create education article failed', error);
  }
});

router.put('/admin/education/articles-order', requireAdmin, async (req, res) => {
  const slugs = req.body?.slugs;
  if (!Array.isArray(slugs) || !slugs.every(validSlug)) return res.status(400).json({ error: 'A list of article slugs is required.' });
  try {
    await reorder('education_articles', 'slug', slugs);
    res.json({ ok: true });
  } catch (error) {
    fail(res, 'Reorder education articles failed', error);
  }
});

router.put('/admin/education/articles/:slug', requireAdmin, async (req, res) => {
  const { value, error: invalid } = normalizeArticleInput(req.body, { creating: false });
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const { data, error } = await supabase
      .from('education_articles')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('slug', req.params.slug)
      .select()
      .maybeSingle();
    if (error?.code === '23503') return res.status(400).json({ error: 'That category no longer exists.' });
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Article not found.' });
    res.json(articleFromRow(data));
  } catch (error) {
    fail(res, 'Update education article failed', error);
  }
});

router.delete('/admin/education/articles/:slug', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('education_articles').delete().eq('slug', req.params.slug);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    fail(res, 'Delete education article failed', error);
  }
});

module.exports = router;
