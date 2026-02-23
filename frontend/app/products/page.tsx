'use client';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getProducts } from '../../lib/api';

const categoryLabels = {
  bag: 'Bags',
  water: 'Water',
  food: 'Food',
  medical: 'Medical',
  tools: 'Tools',
  shelter: 'Shelter',
  clothing: 'Clothing'
};

const categoryIcons = {
  bag: '🎒',
  water: '💧',
  food: '🥫',
  medical: '🩺',
  tools: '🔧',
  shelter: '⛺',
  clothing: '🧤'
};

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts()
      .then(data => {
        setProducts(data);
        setFiltered(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load products.');
        setLoading(false);
      });
  }, []);

  function filterByCategory(category) {
    setActiveCategory(category);
    if (category === 'all') {
      setFiltered(products);
    } else {
      setFiltered(products.filter(p => p.category === category));
    }
  }

  const categories = ['all', ...Object.keys(categoryLabels)];
  const categoriesInUse = ['all', ...new Set(products.map(p => p.category))];

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Products</h1>
        <p className="text-stone-400 mb-8">Everything that goes into your kit — available individually too.</p>

        {/* Category Filter */}
        {!loading && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categoriesInUse.map(cat => (
              <button
                key={cat}
                onClick={() => filterByCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  activeCategory === cat
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All' : `${categoryIcons[cat] || ''} ${categoryLabels[cat] || cat}`}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-32">
            <p className="text-stone-400">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && (
          <>
            <p className="text-stone-500 text-sm mb-4">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(product => (
                <div
                  key={product.id}
                  className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col justify-between hover:border-stone-600 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-stone-500 uppercase tracking-widest">
                        {categoryIcons[product.category]} {categoryLabels[product.category] || product.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.in_stock ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-stone-400 text-sm mb-3">{product.description}</p>
                    )}
                    <div className="flex gap-3 text-xs text-stone-500">
                      {product.weight_grams && <span>{product.weight_grams}g</span>}
                      {product.size && <span>Size: {product.size}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-800">
                    <span className="text-xl font-bold">{formatPrice(product.price_cents)}</span>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-stone-400">No products in this category.</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
