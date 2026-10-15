'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { getKits } from '../../lib/api';

type Kit = {
  id: string;
  name: string;
  total_price_cents: number;
  image_url?: string;
};

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
  { value: 'name_desc', label: 'Name: Z → A' },
];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  useEffect(() => {
    getKits()
      .then(data => setKits(data))
      .catch(() => setError('Failed to load kits.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredKits = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = kits.filter(kit => kit.name.toLowerCase().includes(query));
    if (sortBy === 'price_asc') result.sort((a, b) => a.total_price_cents - b.total_price_cents);
    if (sortBy === 'price_desc') result.sort((a, b) => b.total_price_cents - a.total_price_cents);
    if (sortBy === 'name_asc') result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'name_desc') result.sort((a, b) => b.name.localeCompare(a.name));
    return result;
  }, [kits, search, sortBy]);

  const hasActiveFilters = search.trim() !== '' || sortBy !== 'featured';

  function clearFilters() {
    setSearch('');
    setSortBy('featured');
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">{'// Ready-to-go bundles'}</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-wide">Kits</h1>
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search kits..."
                  className="w-full bg-stone-800 border border-stone-700 rounded pl-9 pr-4 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value)}
                className={`bg-stone-800 border rounded px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                  sortBy !== 'featured' ? 'border-orange-500 text-orange-400' : 'border-stone-700 text-stone-300'
                }`}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="label-tactical text-stone-500 hover:text-orange-400 transition-colors tracking-widest border border-stone-700 hover:border-orange-500/50 px-3 py-2 rounded text-xs"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {!loading && !error && (
          <p className="label-tactical text-stone-500 mb-5">
            {filteredKits.length} {filteredKits.length === 1 ? 'kit' : 'kits'} found
            {hasActiveFilters && <span className="text-stone-600"> (filtered)</span>}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-32">
            <p className="label-tactical text-stone-500 tracking-widest">Loading kits...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && filteredKits.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKits.map(kit => (
                <Link
                  key={kit.id}
                  href={`/kits/${kit.id}`}
                  className="group bg-stone-900/80 border border-stone-800 rounded flex flex-col hover:border-orange-500/40 transition-all hover:shadow-lg hover:shadow-orange-500/5"
                >
                  <div className="w-full aspect-video overflow-hidden rounded-t border-b border-stone-800 relative bg-stone-900">
                    {kit.image_url ? (
                      <img
                        src={kit.image_url}
                        alt={kit.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-700 text-4xl">🎒</div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <h2 className="font-bold text-base uppercase tracking-wide group-hover:text-orange-400 transition-colors leading-tight">
                      {kit.name}
                    </h2>
                    <span aria-hidden="true" className="text-orange-500 text-lg shrink-0">→</span>
                  </div>
                  <div className="px-4 py-3.5 border-t border-stone-800 flex items-center justify-between">
                    <span className="text-xl font-extrabold tracking-wide">{formatPrice(kit.total_price_cents)}</span>
                    <span className="label-tactical text-stone-600 group-hover:text-orange-500 transition-colors tracking-widest">
                      View Details →
                    </span>
                  </div>
                </Link>
            ))}
          </div>
        )}

        {!loading && !error && filteredKits.length === 0 && (
          <div className="text-center py-24 border border-dashed border-stone-800 rounded">
            <p className="text-stone-400 mb-2 font-semibold uppercase tracking-wider">
              {kits.length ? 'No kits match your search' : 'Kits coming soon'}
            </p>
            <p className="label-tactical text-stone-600">
              {kits.length ? 'Try a different kit name.' : 'Our ready-to-go kits are being prepared.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
