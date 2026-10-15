'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { getKit } from '../../../lib/api';
import { useCart } from '../../../lib/cartContext';

type KitItem = {
  type?: 'product' | 'kit';
  name: string;
  description?: string;
  quantity: number;
  image_url?: string;
  items?: KitItem[];
};

type Kit = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  tag?: string;
  total_price_cents: number;
  items: KitItem[];
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function KitContents({ items, multiplier = 1 }: { items: KitItem[]; multiplier?: number }) {
  return (
    <ul className="space-y-4">
      {items.map((item, index) => {
        const quantity = multiplier * (item.quantity || 1);
        return (
          <li key={`${item.name}-${index}`} className="border-b border-stone-800 pb-4 last:border-0 last:pb-0">
            <div className="flex items-start gap-4">
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-16 h-16 object-contain bg-white rounded shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm">
                  {quantity > 1 && <span className="text-orange-400 mr-2">{quantity} ×</span>}
                  {item.name}
                </p>
                {item.type === 'kit' && item.description && (
                  <p className="text-stone-400 text-sm leading-relaxed mt-1 whitespace-pre-wrap">{item.description}</p>
                )}
                {item.type === 'kit' && item.items && item.items.length > 0 && (
                  <div className="mt-4 pl-4 border-l border-stone-700">
                    <KitContents items={item.items} multiplier={quantity} />
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function KitDetailPage() {
  const params = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    getKit(params.id)
      .then(data => setKit(data))
      .catch(() => setError('Kit not found.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  function handleAddToCart() {
    if (!kit) return;
    addItem({
      id: kit.id,
      type: 'kit',
      name: kit.name,
      image_url: kit.image_url,
      price_cents: kit.total_price_cents,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="label-tactical text-stone-600 mb-8">
          <Link href="/kits" className="hover:text-orange-400 transition-colors">Kits</Link>
          {kit && <><span className="mx-2">/</span><span className="text-stone-400">{kit.name}</span></>}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <p className="label-tactical text-stone-500 tracking-widest">Loading kit...</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-24 border border-dashed border-stone-800 rounded">
            <p className="text-red-400 mb-5">{error}</p>
            <Link href="/kits" className="text-orange-500 hover:text-orange-400 text-sm uppercase tracking-widest">
              ← Browse Kits
            </Link>
          </div>
        )}

        {!loading && kit && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
              <div className="w-full aspect-square border border-stone-800 rounded overflow-hidden bg-stone-900/60">
                {kit.image_url ? (
                  <img src={kit.image_url} alt={kit.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-700 text-6xl">🎒</div>
                )}
              </div>
              <div className="flex flex-col gap-6">
                {kit.tag && <p className="label-tactical text-orange-500 tracking-widest">{kit.tag}</p>}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-wide mb-4">{kit.name}</h1>
                  <p className="text-3xl font-extrabold text-orange-500">{formatPrice(kit.total_price_cents)}</p>
                </div>
                {kit.description && (
                  <p className="text-stone-300 leading-relaxed text-sm whitespace-pre-wrap">{kit.description}</p>
                )}
                <button
                  onClick={handleAddToCart}
                  className={`text-white text-xs font-bold uppercase tracking-widest px-6 py-4 rounded transition-colors mt-auto ${
                    added ? 'bg-green-600 hover:bg-green-500' : 'bg-orange-600 hover:bg-orange-500'
                  }`}
                >
                  {added ? 'Added to Cart ✓' : 'Add to Cart →'}
                </button>
              </div>
            </div>

            <section className="bg-stone-900/80 border border-stone-800 rounded p-6 sm:p-8">
              <p className="label-tactical text-orange-500 tracking-[0.15em] mb-6">{'// Kit Contents'}</p>
              {kit.items?.length ? (
                <KitContents items={kit.items} />
              ) : (
                <p className="text-stone-500 text-sm">Kit contents have not been added yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
