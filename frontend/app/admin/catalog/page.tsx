// @ts-nocheck
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { adminGetProducts, getAdminToken } from '../../../lib/api';
import { useCart } from '../../../lib/cartContext';

const categoryLabels = {
  bag: 'Bags', water: 'Water', food: 'Food', medical: 'Medical',
  tools: 'Tools', shelter: 'Shelter', clothing: 'Clothing'
};

const categoryIcons = {
  bag: '🎒', water: '💧', food: '🥫', medical: '🩺',
  tools: '🔧', shelter: '⛺', clothing: '🧤'
};

const SORT_OPTIONS = [
  { value: 'featured',    label: 'Featured' },
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'name_asc',    label: 'Name: A → Z' },
  { value: 'name_desc',   label: 'Name: Z → A' },
];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getFromPrice(product: any): { cents: number; from: boolean } {
  const sizePrices = (product.sizes || [])
    .filter((s: any) => s && typeof s === 'object' && s.price_cents)
    .map((s: any) => s.price_cents as number);

  if (sizePrices.length === 0) return { cents: product.price_cents, from: false };

  const min = Math.min(...sizePrices);
  const max = Math.max(...sizePrices);
  return { cents: min, from: min !== max };
}

function isUSA(origin?: string) {
  return /\b(usa|u\.s\.a\.?|united states)\b/i.test(origin || '');
}

function displayWeight(grams: number): string {
  const oz = grams / 28.3495;
  if (oz < 16) return `${oz.toFixed(1)} oz`;
  const lbs = Math.floor(oz / 16);
  const remOz = oz % 16;
  if (remOz < 0.5) return `${lbs} lb${lbs !== 1 ? 's' : ''}`;
  return `${lbs} lb${lbs !== 1 ? 's' : ''} ${remOz.toFixed(1)} oz`;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter / sort state
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeBrand, setActiveBrand] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const { addItem } = useCart();

  useEffect(() => {
    if (!getAdminToken()) {
      router.push('/admin');
      return;
    }

    adminGetProducts()
      .then(data => { setProducts(data); setLoading(false); })
      .catch(() => { setError('Failed to load products.'); setLoading(false); });
  }, [router]);

  // Derived option lists (only show values that exist in data)
  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products]);
  const brands     = useMemo(() => ['all', ...Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort()], [products]);

  // Apply all filters + sort
  const filtered = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'all') result = result.filter(p => p.category === activeCategory);
    if (activeBrand     !== 'all') result = result.filter(p => p.brand     === activeBrand);
    if (inStockOnly)               result = result.filter(p => p.in_stock);

    switch (sortBy) {
      case 'price_asc':  result.sort((a, b) => a.price_cents - b.price_cents); break;
      case 'price_desc': result.sort((a, b) => b.price_cents - a.price_cents); break;
      case 'name_asc':   result.sort((a, b) => a.name.localeCompare(b.name));  break;
      case 'name_desc':  result.sort((a, b) => b.name.localeCompare(a.name));  break;
    }

    return result;
  }, [products, search, activeCategory, activeBrand, sortBy, inStockOnly]);

  function clearFilters() {
    setSearch('');
    setActiveCategory('all');
    setActiveBrand('all');
    setSortBy('featured');
    setInStockOnly(false);
  }

  const hasActiveFilters = search || activeCategory !== 'all' || activeBrand !== 'all' || inStockOnly || sortBy !== 'featured';

  function handleQuickAdd(product: any) {
    addItem({
      id: product.id,
      type: 'product',
      name: product.name,
      image_url: product.images?.[0],
      price_cents: product.price_cents,
      quantity: 1,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="mb-8">
          <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Equipment Catalog</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-wide">Products</h1>
        </div>

        {/* ── Filter / Sort Bar ── */}
        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 mb-6">
          <div className="flex flex-col gap-3">

            {/* Row 1: Search + Sort + In Stock */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-stone-800 border border-stone-700 rounded pl-9 pr-4 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Brand */}
              {brands.length > 1 && (
                <select
                  value={activeBrand}
                  onChange={e => setActiveBrand(e.target.value)}
                  className={`bg-stone-800 border rounded px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                    activeBrand !== 'all' ? 'border-orange-500 text-orange-400' : 'border-stone-700 text-stone-300'
                  }`}
                >
                  <option value="all">All Brands</option>
                  {brands.filter(b => b !== 'all').map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className={`bg-stone-800 border rounded px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                  sortBy !== 'featured' ? 'border-orange-500 text-orange-400' : 'border-stone-700 text-stone-300'
                }`}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* In Stock toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setInStockOnly(v => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${inStockOnly ? 'bg-orange-500' : 'bg-stone-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${inStockOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className={`label-tactical ${inStockOnly ? 'text-orange-400' : 'text-stone-500'}`}>In Stock Only</span>
              </label>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="label-tactical text-stone-500 hover:text-orange-400 transition-colors tracking-widest border border-stone-700 hover:border-orange-500/50 px-3 py-2 rounded text-xs"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Row 2: Category pills */}
            {!loading && categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded text-xs uppercase tracking-widest font-semibold border transition-all ${
                      activeCategory === cat
                        ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                        : 'border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-300'
                    }`}
                  >
                    {cat === 'all' ? 'All Categories' : `${categoryIcons[cat] || ''} ${categoryLabels[cat] || cat}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-5">
            <p className="label-tactical text-stone-500">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'} found
              {hasActiveFilters && <span className="text-stone-600"> (filtered)</span>}
            </p>
            {hasActiveFilters && filtered.length === 0 && (
              <button onClick={clearFilters} className="label-tactical text-orange-500 hover:text-orange-400 tracking-widest">
                Clear filters →
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <p className="label-tactical text-stone-500 tracking-widest">Loading catalog...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => {
              const isSimple = !product.colors?.length && !product.sizes?.length && !product.variant_groups?.length;
              return (
              <div
                key={product.id}
                className="group relative bg-stone-900/80 border border-stone-800 rounded flex flex-col hover:border-orange-500/40 transition-all hover:shadow-lg hover:shadow-orange-500/5"
              >
                <div className="pointer-events-none absolute inset-x-2 top-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="overflow-hidden rounded border border-orange-500/30 bg-stone-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-sm">
                    <div className="relative w-full aspect-video overflow-hidden rounded mb-2 bg-stone-900">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-700 text-2xl">{categoryIcons[product.category] || '📦'}</div>
                      )}
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-orange-400 mb-1">Quick View</p>
                    <p className="text-xs text-stone-300 leading-relaxed line-clamp-3">{product.description || 'A trusted essential for your kit and everyday readiness.'}</p>
                  </div>
                </div>

                <Link href="/admin/products" className="flex flex-col flex-1 min-h-0">
                {/* Cover image */}
                <div className={`w-full aspect-video overflow-hidden rounded-t border-b border-stone-800 relative ${product.image_fit === 'contain' ? 'bg-white' : 'bg-stone-900'}`}>
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className={`w-full h-full ${product.image_fit === 'contain' ? 'object-contain' : 'object-cover group-hover:scale-105 transition-transform duration-300'}`}
                      onError={e => { (e.target as HTMLImageElement).parentElement!.classList.add('no-img'); (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-800 text-3xl">
                      {categoryIcons[product.category] || '📦'}
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    {isUSA(product.country_of_origin) && (
                      <div className="bg-stone-950/80 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 border border-stone-700">
                        <img src="https://flagcdn.com/w20/us.png" alt="US flag" className="w-4 h-auto" />
                        <span className="label-tactical text-stone-300 tracking-widest" style={{ fontSize: '0.55rem' }}>USA</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                      product.in_stock
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-stone-900/80 text-stone-600 border border-stone-700'
                    }`}>
                      {product.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col flex-1 gap-3">

                  {/* Category */}
                  <div className="flex items-center justify-between">
                    <span className="label-tactical text-stone-600">
                      {categoryIcons[product.category]} {categoryLabels[product.category] || product.category}
                    </span>
                  </div>

                  {/* Brand + Name */}
                  <div>
                    {product.brand && (
                      <p className="label-tactical text-orange-500/70 tracking-wider mb-0.5">{product.brand}</p>
                    )}
                    <h3 className="font-bold text-base uppercase tracking-wide group-hover:text-orange-400 transition-colors leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  {/* Description */}
                  {product.description && (
                    <p className="text-stone-500 text-xs leading-relaxed line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Specs grid — hidden when size variants exist (each variant has its own specs) */}
                  {!product.sizes?.length && (product.weight_grams || product.size) && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-stone-800/60 pt-3">
                      {product.weight_grams && (
                        <div>
                          <p className="label-tactical text-stone-600 mb-0.5" style={{ fontSize: '0.7rem' }}>WEIGHT</p>
                          <p className="text-stone-300 text-xs font-semibold">{displayWeight(product.weight_grams)}</p>
                        </div>
                      )}
                      {product.size && (
                        <div>
                          <p className="label-tactical text-stone-600 mb-0.5" style={{ fontSize: '0.7rem' }}>DIMENSIONS</p>
                          <p className="text-stone-300 text-xs font-semibold">{product.size}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sizes */}
                  {product.sizes?.length > 0 && (
                    <div className="border-t border-stone-800/60 pt-3">
                      <p className="label-tactical text-stone-600 mb-1.5" style={{ fontSize: '0.7rem' }}>AVAILABLE SIZES</p>
                      <div className="flex flex-wrap gap-1">
                        {product.sizes.map((s, i) => (
                          <span
                            key={i}
                            className="text-xs border border-stone-700 text-stone-400 px-2 py-0.5 rounded uppercase tracking-wide font-semibold"
                          >
                            {typeof s === 'string' ? s : s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {product.colors?.length > 0 && (
                    <div className="border-t border-stone-800/60 pt-3">
                      <p className="label-tactical text-stone-600 mb-1.5" style={{ fontSize: '0.7rem' }}>
                        {product.colors.length} {product.colors.length === 1 ? 'COLOR' : 'COLORS'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {product.colors.slice(0, 10).map((c, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full border border-stone-600 shrink-0"
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                        {product.colors.length > 10 && (
                          <span className="label-tactical text-stone-600 text-xs">+{product.colors.length - 10} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card footer: price + CTA */}
                </Link>
                <div className="px-4 py-3.5 border-t border-stone-800 flex items-center justify-between">
                  {(() => { const p = getFromPrice(product); return (
                    <span className="text-xl font-extrabold tracking-wide">
                      {p.from && <span className="text-sm font-normal text-stone-500 mr-1">from</span>}
                      {formatPrice(p.cents)}
                    </span>
                  ); })()}
                  <div className="flex items-center gap-3">
                    {isSimple && product.in_stock && product.is_visible !== false && (
                      <button
                        onClick={() => handleQuickAdd(product)}
                        className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded border transition-colors ${addedId === product.id ? 'border-green-500 text-green-400' : 'border-orange-500 text-orange-400 hover:bg-orange-500/10'}`}
                      >
                        {addedId === product.id ? 'Added ✓' : '+ Cart'}
                      </button>
                    )}
                    <Link href="/admin/products" className="label-tactical text-stone-600 group-hover:text-orange-500 transition-colors tracking-widest">
                      Manage →
                    </Link>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24 border border-dashed border-stone-800 rounded">
            <p className="text-stone-400 mb-2 font-semibold uppercase tracking-wider">No products match your filters</p>
            <p className="label-tactical text-stone-600 mb-6">Try adjusting your search or clearing the filters.</p>
            <button
              onClick={clearFilters}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
