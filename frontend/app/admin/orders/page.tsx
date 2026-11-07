'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminToken, adminGetOrders, adminUpdateOrderStatus } from '../../../lib/api';
import type { Json, Order } from '../../../lib/types';

// customizations is a freeform JSONB blob on orders; read known keys through this helper.
const cust = (order: Order): Record<string, Json> =>
  (order.customizations && typeof order.customizations === 'object' && !Array.isArray(order.customizations)
    ? order.customizations
    : {}) as Record<string, Json>;

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  placed:          'text-blue-400 border-blue-500/30 bg-blue-500/10',
  paid:            'text-green-400 border-green-500/30 bg-green-500/10',
  processing:      'text-blue-400 border-blue-500/30 bg-blue-500/10',
  shipped:         'text-teal-400 border-teal-500/30 bg-teal-500/10',
  delivered:       'text-green-400 border-green-500/30 bg-green-500/10',
  cancelled:       'text-red-400 border-red-500/30 bg-red-500/10',
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  placed:          'Placed',
  paid:            'Paid',
  processing:      'Processing',
  shipped:         'Shipped',
  delivered:       'Delivered',
  cancelled:       'Cancelled',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function customerName(order: Order) {
  return String(cust(order).guest_name || 'Account Customer');
}

function customerEmail(order: Order) {
  return String(cust(order).customer_email || cust(order).guest_email || '—');
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminToken()) { router.push('/admin'); return; }
    adminGetOrders()
      .then(setOrders)
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const counts: Record<string, number> = { all: orders.length };
  ALL_STATUSES.forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });

  async function handleStatusChange(orderId: string, newStatus: string) {
    setUpdatingStatus(orderId);
    try {
      const updated = await adminUpdateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingStatus(null);
    }
  }

  function copyLink(url: string, orderId: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(orderId);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="label-tactical text-stone-500 tracking-widest">Loading orders...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">BaselineKits</Link>
          <span className="label-tactical text-stone-600">/ Orders</span>
        </div>
        <Link href="/admin" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">← Dashboard</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">{"// Order Management"}</p>
            <h1 className="text-3xl font-extrabold uppercase tracking-wide">Orders</h1>
          </div>
          <Link
            href="/admin/orders/new"
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
          >
            + New Phone Order
          </Link>
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-6 pb-5 border-b border-stone-800">
          {[['all', 'All'], ...ALL_STATUSES.map(s => [s, STATUS_LABELS[s]])].map(([val, label]) => (
            counts[val] > 0 || val === 'all' ? (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest border transition-all ${filter === val ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-white'}`}
              >
                {label} {counts[val] > 0 && <span className="ml-1 opacity-60">{counts[val]}</span>}
              </button>
            ) : null
          ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="label-tactical text-stone-500">No orders {filter !== 'all' ? `with status "${STATUS_LABELS[filter]}"` : 'yet'}.</p>
            {filter === 'all' && (
              <Link href="/admin/orders/new" className="inline-block mt-4 text-orange-500 hover:text-orange-400 text-sm transition-colors">
                Create your first phone order →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(order => {
              const custData = cust(order);
              const isPhoneOrder = custData.phone_order;
              const paymentUrl = custData.payment_url;
              const isCopied = copied === order.id;
              const isUpdating = updatingStatus === order.id;

              return (
                <div key={order.id} className="bg-stone-900/80 border border-stone-800 rounded p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: customer + order info */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-white">{customerName(order)}</span>
                        {isPhoneOrder && (
                          <span className="label-tactical text-orange-400/80 border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 rounded" style={{ fontSize: '0.55rem' }}>PHONE</span>
                        )}
                        <span className={`label-tactical border px-2 py-0.5 rounded text-xs ${STATUS_COLORS[order.status] || 'text-stone-400 border-stone-700'}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                      <span className="text-stone-400 text-xs">{customerEmail(order)}</span>
                      {(custData.phone_number || custData.guest_phone) && (
                        <span className="text-stone-500 text-xs">{String(custData.phone_number || custData.guest_phone)}</span>
                      )}
                      {custData.terms_accepted_at && (
                        <span className="text-stone-500 text-xs">
                          Terms {String(custData.terms_version || 'accepted')} · {formatDate(String(custData.terms_accepted_at))} · Marketing {custData.marketing_opt_in ? 'opted in' : 'not opted in'}
                        </span>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="label-tactical text-stone-500" style={{ fontSize: '0.6rem' }}>
                          {order.kits?.name || 'Mixed Cart'}
                        </span>
                        <span className="label-tactical text-stone-600" style={{ fontSize: '0.6rem' }}>
                          {formatDate(order.created_at)}
                        </span>
                        {custData.notes && (
                          <span className="label-tactical text-stone-600 italic" style={{ fontSize: '0.6rem' }}>
                            Note: {String(custData.notes)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: total + actions */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      <div className="text-right">
                        <span className="text-white font-bold text-sm">{fmt(order.total_cents)}</span>
                        {typeof custData.stripe_tax_cents === 'number' && (
                          <span className="block text-stone-500 text-xs">
                            Includes {fmt(custData.stripe_tax_cents)} tax
                          </span>
                        )}
                      </div>

                      {/* Copy payment link for pending orders */}
                      {order.status === 'pending_payment' && paymentUrl && (
                        <button
                          onClick={() => copyLink(String(paymentUrl), order.id)}
                          className={`label-tactical text-xs px-3 py-1.5 rounded border transition-all ${isCopied ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10'}`}
                        >
                          {isCopied ? '✓ Copied' : 'Copy Payment Link'}
                        </button>
                      )}

                      {/* Status changer */}
                      <select
                        value={order.status}
                        onChange={e => handleStatusChange(order.id, e.target.value)}
                        disabled={isUpdating}
                        className="bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500 disabled:opacity-40"
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Order ID */}
                  <p className="label-tactical text-stone-700 mt-2" style={{ fontSize: '0.55rem' }}>ID: {order.id}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
