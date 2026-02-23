'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { lookupOrder } from '../../lib/api';
import Navbar from '../components/Navbar';

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const statusSteps = ['placed', 'paid', 'packed', 'shipped', 'delivered'];
const statusLabels = { placed: 'Order Received', paid: 'Payment Confirmed', packed: 'Being Packed', shipped: 'Shipped', delivered: 'Delivered' };
const statusIcons = { placed: '📋', paid: '💳', packed: '🎒', shipped: '🚚', delivered: '✅' };

function TrackContent() {
  const params = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('order_id') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-lookup if order_id is in URL
  useEffect(() => {
    const id = params.get('order_id');
    if (id) {
      setOrderId(id);
      doLookup(id);
    }
  }, []);

  async function doLookup(id) {
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const data = await lookupOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Order not found. Double-check your order number and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(e) {
    e.preventDefault();
    if (!orderId.trim()) return;
    doLookup(orderId.trim());
  }

  const currentStep = order ? statusSteps.indexOf(order.status) : -1;

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
      <p className="text-stone-400 mb-8">Enter the order number from your confirmation email.</p>

      <form onSubmit={handleLookup} className="flex gap-3 mb-8">
        <input
          type="text"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder="Paste your order number here"
          className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
        />
        <button type="submit" disabled={loading || !orderId.trim()}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap">
          {loading ? '...' : 'Track →'}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {order && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-stone-400 text-xs mb-1">Order #{order.order_id.slice(0, 8).toUpperCase()}</p>
              <h2 className="text-xl font-bold">{order.kit_name}</h2>
              <p className="text-stone-400 text-sm mt-1">
                Placed {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <p className="text-stone-400 text-sm font-semibold">{formatPrice(order.total_cents)}</p>
          </div>

          <div className="flex items-start justify-between mb-2">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1 flex-1">
                <div className={`text-xl ${i <= currentStep ? 'opacity-100' : 'opacity-20'}`}>{statusIcons[step]}</div>
                <div className={`h-1 w-full rounded ${i <= currentStep ? 'bg-orange-500' : 'bg-stone-700'}`} />
                <p className={`text-xs text-center leading-tight ${i <= currentStep ? 'text-white' : 'text-stone-600'}`}>
                  {statusLabels[step]}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-stone-800 rounded-lg px-4 py-3">
            <p className="text-sm text-stone-300">{order.status_message}</p>
            {order.shipped_at && (
              <p className="text-xs text-stone-500 mt-1">Shipped {new Date(order.shipped_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <p className="text-stone-500 text-sm">
          Have an account?{' '}
          <Link href="/login" className="text-orange-500 hover:text-orange-400">Log in</Link>
          {' '}to see all your orders in one place.
        </p>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <Suspense fallback={<div className="flex items-center justify-center py-32"><p className="text-stone-400">Loading...</p></div>}>
        <TrackContent />
      </Suspense>
    </main>
  );
}
