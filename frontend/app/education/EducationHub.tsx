'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useEducation } from '../../lib/useEducation';

export default function EducationHub() {
  const { loading, categories: CATEGORIES, articles: ARTICLES } = useEducation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ARTICLES.filter(article => {
      if (category !== 'all' && article.category !== category) return false;
      if (!needle) return true;
      return `${article.title} ${article.summary} ${article.ourApproach}`.toLowerCase().includes(needle);
    });
  }, [query, category, ARTICLES]);

  return (
    <>
      <div className="mb-10 flex flex-col gap-4">
        <label className="sr-only" htmlFor="education-search">Search education</label>
        <input
          id="education-search"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search topics..."
          className="w-full max-w-md bg-stone-900 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
        />
        <div className="flex flex-wrap gap-2">
          {[{ id: 'all', label: 'All' }, ...CATEGORIES].map(item => (
            <button
              key={item.id}
              onClick={() => setCategory(item.id)}
              aria-pressed={category === item.id}
              className={`text-xs uppercase tracking-widest font-semibold px-3 py-2 rounded border transition-colors ${
                category === item.id
                  ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                  : 'border-stone-700 text-stone-400 hover:text-white hover:border-stone-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-stone-400">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-stone-400">No articles match your search.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map(article => {
            const categoryLabel = CATEGORIES.find(item => item.id === article.category)?.label;
            return (
              <Link
                key={article.slug}
                href={`/education/${article.slug}`}
                className="group flex flex-col border border-stone-800 bg-stone-900 rounded-xl p-6 hover:border-orange-500/50 transition-colors"
              >
                <p className="text-xs uppercase tracking-widest text-orange-500 mb-3">{categoryLabel}</p>
                <h2 className="text-lg font-bold mb-2 group-hover:text-orange-400 transition-colors">{article.title}</h2>
                <p className="text-stone-400 text-sm leading-relaxed mb-4">{article.summary}</p>
                <p className="mt-auto text-xs text-stone-500">{article.readMinutes} min read</p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
