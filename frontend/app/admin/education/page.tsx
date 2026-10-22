// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminToken,
  adminGetEducation,
  adminCreateEducationCategory,
  adminUpdateEducationCategory,
  adminDeleteEducationCategory,
  adminCreateEducationArticle,
  adminUpdateEducationArticle,
  adminDeleteEducationArticle,
} from '../../../lib/api';

const inputClass = 'w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500';
const labelClass = 'block text-xs uppercase tracking-widest text-stone-400 mb-1';
const smallButton = 'text-xs uppercase tracking-widest px-3 py-2 rounded border border-stone-700 text-stone-300 hover:border-orange-500 hover:text-orange-400 transition-colors disabled:opacity-40';
const dangerButton = 'text-xs uppercase tracking-widest px-3 py-2 rounded border border-red-900 text-red-400 hover:border-red-500 transition-colors';

const blankSection = () => ({ heading: '', paragraphs: [''], bullets: [] });

const blankArticle = (category) => ({
  slug: null,
  title: '',
  category,
  summary: '',
  readMinutes: 3,
  ourApproach: '',
  sections: [blankSection()],
  related: [],
  published: true,
});

function CategoryRow({ category, count, onSave, onDelete }) {
  const [label, setLabel] = useState(category.label);
  const [blurb, setBlurb] = useState(category.blurb);
  const dirty = label !== category.label || blurb !== category.blurb;

  return (
    <div className="border border-stone-800 rounded p-4 flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1">
        <label className={labelClass}>Name</label>
        <input className={inputClass} value={label} onChange={e => setLabel(e.target.value)} />
      </div>
      <div className="flex-[2]">
        <label className={labelClass}>Short description</label>
        <input className={inputClass} value={blurb} onChange={e => setBlurb(e.target.value)} />
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-xs text-stone-500 w-16">{count} card{count === 1 ? '' : 's'}</span>
        <button className={smallButton} disabled={!dirty || !label.trim()} onClick={() => onSave(category.id, { label, blurb })}>Save</button>
        <button className={dangerButton} onClick={() => onDelete(category)}>Delete</button>
      </div>
    </div>
  );
}

function ArticleEditor({ draft, categories, articles, saving, onChange, onSave, onCancel }) {
  const isNew = !draft.slug;
  const update = (patch) => onChange({ ...draft, ...patch });
  const updateSection = (index, patch) =>
    update({ sections: draft.sections.map((section, i) => (i === index ? { ...section, ...patch } : section)) });
  const moveSection = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= draft.sections.length) return;
    const sections = [...draft.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    update({ sections });
  };
  const others = articles.filter(a => a.slug !== draft.slug);
  const toggleRelated = (slug) =>
    update({ related: draft.related.includes(slug) ? draft.related.filter(s => s !== slug) : [...draft.related, slug] });

  return (
    <div className="border border-orange-500/40 rounded p-6 bg-stone-900/80 flex flex-col gap-5">
      <h3 className="text-xl font-bold uppercase tracking-wider">{isNew ? 'New card' : 'Edit card'}</h3>

      <div>
        <label className={labelClass}>Heading (title)</label>
        <input className={inputClass} value={draft.title} onChange={e => update({ title: e.target.value })} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelClass}>Category</label>
          <select className={inputClass} value={draft.category} onChange={e => update({ category: e.target.value })}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Read time (minutes)</label>
          <input type="number" min="1" max="120" className={inputClass} value={draft.readMinutes} onChange={e => update({ readMinutes: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-300 md:self-end md:pb-2">
          <input type="checkbox" checked={draft.published} onChange={e => update({ published: e.target.checked })} />
          Published (uncheck to hide as a draft)
        </label>
      </div>

      <div>
        <label className={labelClass}>Card text (summary shown on the hub)</label>
        <textarea rows={2} className={inputClass} value={draft.summary} onChange={e => update({ summary: e.target.value })} />
      </div>

      <div>
        <label className={labelClass}>Our approach callout (leave blank to hide)</label>
        <textarea rows={2} className={inputClass} value={draft.ourApproach} onChange={e => update({ ourApproach: e.target.value })} />
      </div>

      <div className="flex flex-col gap-4">
        <p className={labelClass}>Article sections</p>
        {draft.sections.map((section, index) => (
          <div key={index} className="border border-stone-800 rounded p-4 flex flex-col gap-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className={labelClass}>Section heading</label>
                <input className={inputClass} value={section.heading} onChange={e => updateSection(index, { heading: e.target.value })} />
              </div>
              <button className={smallButton} onClick={() => moveSection(index, -1)} aria-label="Move section up">↑</button>
              <button className={smallButton} onClick={() => moveSection(index, 1)} aria-label="Move section down">↓</button>
              <button className={dangerButton} onClick={() => update({ sections: draft.sections.filter((_, i) => i !== index) })}>Remove</button>
            </div>
            <div>
              <label className={labelClass}>Text (blank line between paragraphs)</label>
              <textarea
                rows={5}
                className={inputClass}
                value={section.paragraphs.join('\n\n')}
                onChange={e => updateSection(index, { paragraphs: e.target.value.split(/\n{2,}/) })}
              />
            </div>
            <div>
              <label className={labelClass}>Bullet points (one per line, optional)</label>
              <textarea
                rows={3}
                className={inputClass}
                value={(section.bullets || []).join('\n')}
                onChange={e => updateSection(index, { bullets: e.target.value.split('\n') })}
              />
            </div>
          </div>
        ))}
        <button className={`${smallButton} self-start`} onClick={() => update({ sections: [...draft.sections, blankSection()] })}>
          + Add section
        </button>
      </div>

      {others.length > 0 && (
        <div>
          <p className={labelClass}>Keep reading links</p>
          <div className="flex flex-col gap-1">
            {others.map(a => (
              <label key={a.slug} className="flex items-center gap-2 text-sm text-stone-300">
                <input type="checkbox" checked={draft.related.includes(a.slug)} onChange={() => toggleRelated(a.slug)} />
                {a.title}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="px-5 py-3 rounded bg-orange-500 text-black font-bold uppercase tracking-widest text-sm hover:bg-orange-400 disabled:opacity-50"
          disabled={saving || !draft.title.trim() || !draft.category}
          onClick={onSave}
        >
          {saving ? 'Saving...' : 'Save card'}
        </button>
        <button className={smallButton} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function AdminEducationPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState({ label: '', blurb: '' });

  async function load() {
    try {
      const data = await adminGetEducation();
      setCategories(data.categories);
      setArticles(data.articles);
    } catch (err) {
      setError(err.message || 'Could not load education content.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getAdminToken()) {
      router.push('/admin');
      return;
    }
    load();
  }, []);

  async function run(action, success) {
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
      await load();
      return true;
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      return false;
    }
  }

  async function saveArticle() {
    setSaving(true);
    const ok = await run(
      () => (draft.slug ? adminUpdateEducationArticle(draft.slug, draft) : adminCreateEducationArticle(draft)),
      'Card saved.'
    );
    setSaving(false);
    if (ok) setDraft(null);
  }

  async function removeArticle(article) {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    await run(() => adminDeleteEducationArticle(article.slug), 'Card deleted.');
  }

  async function removeCategory(category) {
    if (!window.confirm(`Delete the "${category.label}" category?`)) return;
    await run(() => adminDeleteEducationCategory(category.id), 'Category deleted.');
  }

  async function addCategory() {
    const ok = await run(() => adminCreateEducationCategory(newCategory), 'Category added.');
    if (ok) setNewCategory({ label: '', blurb: '' });
  }

  const categoryLabel = (id) => categories.find(c => c.id === id)?.label || id;

  return (
    <main className="min-h-screen bg-stone-950 text-white px-6 py-12">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <div>
          <Link href="/admin" className="text-xs uppercase tracking-widest text-stone-500 hover:text-orange-400">&larr; Admin</Link>
          <p className="label-tactical text-orange-500 mt-4 mb-2 tracking-[0.2em]">// Content</p>
          <h1 className="text-4xl font-extrabold uppercase tracking-wide">Education</h1>
          <p className="text-stone-400 mt-3 max-w-2xl">
            Add, edit, and remove education cards and categories. Changes appear on the public Education page right away. The &quot;All&quot; filter is built in and always shown.
          </p>
        </div>

        {error && <p role="alert" className="border border-red-900 bg-red-950/40 text-red-300 rounded px-4 py-3 text-sm">{error}</p>}
        {notice && <p role="status" className="border border-green-900 bg-green-950/40 text-green-300 rounded px-4 py-3 text-sm">{notice}</p>}

        {loading ? (
          <p className="text-stone-400">Loading...</p>
        ) : (
          <>
            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold uppercase tracking-wider">Categories</h2>
              <div className="border border-stone-800 rounded p-4 text-sm text-stone-400">All — built in, cannot be removed.</div>
              {categories.map(category => (
                <CategoryRow
                  key={`${category.id}-${category.label}-${category.blurb}`}
                  category={category}
                  count={articles.filter(a => a.category === category.id).length}
                  onSave={(id, data) => run(() => adminUpdateEducationCategory(id, data), 'Category saved.')}
                  onDelete={removeCategory}
                />
              ))}
              <div className="border border-dashed border-stone-700 rounded p-4 flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className={labelClass}>New category name</label>
                  <input className={inputClass} value={newCategory.label} onChange={e => setNewCategory({ ...newCategory, label: e.target.value })} />
                </div>
                <div className="flex-[2]">
                  <label className={labelClass}>Short description</label>
                  <input className={inputClass} value={newCategory.blurb} onChange={e => setNewCategory({ ...newCategory, blurb: e.target.value })} />
                </div>
                <button className={smallButton} disabled={!newCategory.label.trim()} onClick={addCategory}>+ Add category</button>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider">Cards</h2>
                {!draft && (
                  <button className={smallButton} disabled={categories.length === 0} onClick={() => setDraft(blankArticle(categories[0]?.id))}>
                    + Add card
                  </button>
                )}
              </div>
              {categories.length === 0 && <p className="text-stone-400 text-sm">Add a category before creating cards.</p>}

              {draft && (
                <ArticleEditor
                  draft={draft}
                  categories={categories}
                  articles={articles}
                  saving={saving}
                  onChange={setDraft}
                  onSave={saveArticle}
                  onCancel={() => setDraft(null)}
                />
              )}

              {articles.length === 0 && !draft && <p className="text-stone-400 text-sm">No cards yet.</p>}
              {articles.map(article => (
                <div key={article.slug} className="border border-stone-800 rounded p-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest text-orange-500">
                      {categoryLabel(article.category)}{!article.published && <span className="text-stone-500"> · Draft</span>}
                    </p>
                    <p className="font-bold">{article.title}</p>
                    <p className="text-sm text-stone-400">{article.summary}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={smallButton}
                      onClick={() => {
                        setDraft({ ...article, sections: article.sections.length ? article.sections : [blankSection()] });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Edit
                    </button>
                    <button className={dangerButton} onClick={() => removeArticle(article)}>Delete</button>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
