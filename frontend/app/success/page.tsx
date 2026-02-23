'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('order_id');
  const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : null;

  return (
    <div className="text-center max-w-md w-full">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-bold mb-3">Order Confirmed!</h1>
      <p className="text-stone-400 mb-6">
        Your kit is being packed and will ship to you soon.
      </p>

      {orderId && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 mb-6 text-left">
          <p className="text-stone-400 text-xs mb-1 uppercase tracking-widest">Your Order Number</p>
          <p className="text-white font-mono text-lg font-bold mb-3">{shortId}</p>
          <p className="text-stone-500 text-xs">
            Save this number — you can use it to track your order on our{' '}
            <Link href="/track" className="text-orange-500 hover:text-orange-400">Track Order</Link> page.
          </p>
          <p className="text-stone-600 text-xs mt-1">Full ID: {orderId}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderId && (
          <Link
            href={`/track?order_id=${orderId}`}
            className="border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Track My Order
          </Link>
        )}
        <Link
          href="/"
          className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center px-6">
      <Suspense fallback={<p className="text-stone-400">Loading...</p>}>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
