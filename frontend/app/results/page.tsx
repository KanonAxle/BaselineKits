'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createOrder, createCheckout, getToken } from '../../lib/api';
import Navbar from '../components/Navbar';

export default function ResultsPage() {
  const router = useRouter();
  const [kit, setKit] = useState(null);
  const [removedItems, setRemovedItems] = useState([]);
  const [bagSize, setBagSize] = useState('M');
  const [address, setAddress] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sizeAdjustments = { S: -0.15, M: 0, L: 0.20, XL: 0.30 };
  const sizeLabels = { S: 'Small (-15%)', M: 'Medium (base)', L: 'Large (+20%)', XL: 'Extra Large (+30%)' };

  useEffect(() => {
    setIsLoggedIn(!!getToken());
    const stored = localStorage.getItem('quizResult');
    if (!stored) { router.push('/quiz'); return; }
    setKit(JSON.parse(stored).recommended_kit);
  }, [router]);

  function toggleItem(productId) {
    setRemovedItems(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }

  function calculateTotal() {
    if (!kit) return 0;
    const activeItems = kit.items.filter(item => !removedItems.includes(item.product_id));
    const base = activeItems.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
    return Math.round(base * (1 + sizeAdjustments[bagSize]));
  }

  function formatPrice(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  async function handleOrder() {
    if (!address.trim()) { setError('Please enter your shipping address.'); return; }
    if (!isLoggedIn && !guestEmail.trim()) { setError('Please enter your email address so we can send your order confirmation.'); return; }
    setLoading(true);
    setError('');
    try {
      const order = await createOrder(
        kit.id,
        { bag_size: bagSize, remove_items: removedItems, add_items: [] },
        address,
        isLoggedIn ? null : guestEmail
      );
      const checkout = await createCheckout(
        order.order_id,
        `${window.location.origin}/success?order_id=${order.order_id}`,
        `${window.location.origin}/cancel`
      );
      window.location.href = checkout.url;
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
      setLoading(false);
    }
  }

  if (!kit) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Loading your kit...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="mb-2 text-orange-500 text-sm font-semibold uppercase tracking-widest">Your Recommendation</div>
        <h1 className="text-3xl font-bold mb-2">{kit.name}</h1>
        <p className="text-stone-400 mb-8">{kit.description}</p>

        {/* Bag Size */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Bag Size</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(sizeLabels).map(([size, label]) => (
              <button key={size} onClick={() => setBagSize(size)}
                className={`py-3 px-2 rounded-lg border text-sm transition-all ${bagSize === size ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Kit Items */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Kit Contents — click to remove items</h2>
          <div className="flex flex-col gap-3">
            {kit.items.map(item => {
              const removed = removedItems.includes(item.product_id);
              return (
                <div key={item.product_id} onClick={() => toggleItem(item.product_id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all ${removed ? 'border-stone-700 bg-stone-800/50 opacity-40 line-through' : 'border-stone-700 hover:border-stone-500'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${removed ? 'border-stone-600' : 'border-orange-500 bg-orange-500'}`}>
                      {!removed && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span>{item.name}</span>
                    {item.quantity > 1 && <span className="text-stone-500 text-sm">×{item.quantity}</span>}
                  </div>
                  <span className="text-stone-400 text-sm">{formatPrice(item.price_cents * item.quantity)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping & Contact */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Shipping Details</h2>
          <div className="flex flex-col gap-4">
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, City, State, ZIP"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
            {!isLoggedIn && (
              <div>
                <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                  placeholder="Email address (for order confirmation)"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                <p className="text-stone-500 text-xs mt-2">
                  We'll send your order number here.{' '}
                  <Link href="/login" className="text-orange-500 hover:text-orange-400">Log in</Link> or{' '}
                  <Link href="/register" className="text-orange-500 hover:text-orange-400">create an account</Link> to track all orders in one place.
                </p>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl px-6 py-5">
          <div>
            <div className="text-stone-400 text-sm">Total</div>
            <div className="text-3xl font-bold">{formatPrice(calculateTotal())}</div>
          </div>
          <button onClick={handleOrder} disabled={loading}
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold px-8 py-4 rounded-lg transition-colors">
            {loading ? 'Processing...' : 'Order Now →'}
          </button>
        </div>
        <p className="text-stone-600 text-xs text-center mt-4">You'll be redirected to Stripe for secure payment.</p>
      </div>
    </main>
  );
}
