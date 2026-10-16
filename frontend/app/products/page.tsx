'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { getProducts } from '../../lib/api';

type Product = {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  category: string;
  price_cents: number;
  image_url?: string;
  images?: string[];
  in_stock?: boolean | number;
};

const CATEGORY_LABELS: Record<string, string> = {
  bag: 'Bags',
  water: 'Water',
  food: 'Food',
  medical: 'Medical',
  tools: 'Tools',
  shelter: 'Shelter',
  clothing: 'Clothing',
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    getProducts()
      .then((data: Product[]) => {
        setProducts(data);
        const requestedCategory = new URLSearchParams(window.location.search).get('category');
        if (requestedCategory && data.some(product => product.category === requestedCategory)) {
          setCategory(requestedCategory);
        }
      })
      .catch(() => setError('Failed to load products. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map(product => product.category).filter(Boolean))].sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      const matchesSearch = !query || [
        product.name,
        product.brand,
        product.description,
      ].some(value => value?.toLowerCase().includes(query));
      return matchesSearch && (category === 'all' || product.category === category);
    });
  }, [products, search, category]);

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">{'// Individual essentials'}</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-wide">Products</h1>
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search products..."
              className="flex-1 bg-stone-800 border border-stone-700 rounded px-4 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
            />
            <select
              value={category}
              onChange={event => setCategory(event.target.value)}
              className="bg-stone-800 border border-stone-700 rounded px-3 py-2.5 text-sm text-stone-300 focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Categories</option>
              {categories.map(value => (
                <option key={value} value={value}>{CATEGORY_LABELS[value] || value}</option>
              ))}
            </select>
          </div>
        </div>

        {!loading && !error && (
          <p className="label-tactical text-stone-500 mb-5">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-32">
            <p className="label-tactical text-stone-500 tracking-widest">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group bg-stone-900/80 border border-stone-800 rounded flex flex-col hover:border-orange-500/40 transition-all hover:shadow-lg hover:shadow-orange-500/5"
              >
                <div className="w-full aspect-video overflow-hidden rounded-t border-b border-stone-800 relative bg-stone-900">
                  {(product.images?.[0] || product.image_url) ? (
                    <img
                      src={product.images?.[0] || product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-700 text-4xl">📦</div>
                  )}
                  <span className={`absolute top-2 right-2 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                    product.in_stock
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-stone-900/90 text-stone-500 border border-stone-700'
                  }`}>
                    {product.in_stock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="label-tactical text-stone-600 mb-2">{CATEGORY_LABELS[product.category] || product.category}</p>
                  {product.brand && <p className="label-tactical text-orange-500/70 tracking-wider mb-1">{product.brand}</p>}
                  <h2 className="font-bold text-base uppercase tracking-wide group-hover:text-orange-400 transition-colors leading-tight">
                    {product.name}
                  </h2>
                  {product.description && (
                    <p className="text-stone-500 text-xs leading-relaxed line-clamp-2 mt-2">{product.description}</p>
                  )}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-xl font-extrabold tracking-wide">{formatPrice(product.price_cents)}</span>
                    <span className="label-tactical text-stone-600 group-hover:text-orange-500 transition-colors tracking-widest">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-24 border border-dashed border-stone-800 rounded">
            <p className="text-stone-400 mb-2 font-semibold uppercase tracking-wider">
              {products.length ? 'No products match your search' : 'Products coming soon'}
            </p>
            <p className="label-tactical text-stone-600">
              {products.length ? 'Try a different search or category.' : 'Our individual products will be listed here.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
