import Link from 'next/link';

export default function CancelPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">↩️</div>
        <h1 className="text-3xl font-bold mb-3">Payment Cancelled</h1>
        <p className="text-stone-400 mb-8">
          No worries — your kit recommendation is saved. You can go back and try again whenever you're ready.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/results"
            className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to My Kit
          </Link>
          <Link
            href="/"
            className="border border-stone-700 hover:border-stone-500 text-stone-300 px-6 py-3 rounded-lg transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
