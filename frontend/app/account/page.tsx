'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getOrders, removeToken } from '../../lib/api';
import Navbar from '../components/Navbar';

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const statusColors = {
  placed: 'text-yellow-400',
  paid: 'text-blue-400',
  packed: 'text-purple-400',
  shipped: 'text-orange-400',
  delivered: 'text-green-400'
};

const statusLabels = {
  placed: 'Order Received',
  paid: 'Payment Confirmed',
  packed: 'Being Packed',
  shipped: 'Shipped',
  delivered: 'Delivered'
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [userData, ordersData] = await Promise.all([getMe(), getOrders()]);
        setUser(userData);
        setOrders(ordersData);
      } catch {
        // Token invalid or expired — redirect to login
        removeToken();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Loading your account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Profile */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-8">
          <h1 className="text-2xl font-bold mb-1">{user?.name}</h1>
          <p className="text-stone-400 text-sm">{user?.email}</p>
        </div>

        {/* Order History */}
        <h2 className="text-xl font-bold mb-4">Order History</h2>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {orders.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 text-center">
            <p className="text-stone-400 mb-4">You haven't placed any orders yet.</p>
            <Link href="/quiz" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Build My First Kit →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{order.kit_name}</p>
                    <p className="text-stone-500 text-xs mt-1">
                      Placed {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${statusColors[order.status] || 'text-stone-400'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 text-sm">Total: <span className="text-white font-semibold">{formatPrice(order.total_cents)}</span></span>
                  <p className="text-stone-600 text-xs">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/quiz" className="text-orange-500 hover:text-orange-400 text-sm">
            + Build Another Kit
          </Link>
        </div>
      </div>
    </main>
  );
}
