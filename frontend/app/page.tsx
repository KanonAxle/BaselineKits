import Link from 'next/link';
import Navbar from './components/Navbar';

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">

      <Navbar />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32">
        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          Your Survival Kit,<br />
          <span className="text-orange-500">Built for You</span>
        </h1>
        <p className="mt-6 text-stone-400 text-lg max-w-xl">
          Answer a few questions about your situation and we'll build a custom kit — packed and shipped directly to your door. No account required.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/quiz"
            className="bg-orange-600 hover:bg-orange-500 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-colors"
          >
            Build My Kit →
          </Link>
          <Link
            href="/track"
            className="border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white text-lg px-8 py-4 rounded-lg transition-colors"
          >
            Track My Order
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 py-20 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">📋</div>
            <h3 className="font-semibold text-lg">1. Answer Questions</h3>
            <p className="text-stone-400 text-sm">Tell us your use case, duration, and environment.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">🎒</div>
            <h3 className="font-semibold text-lg">2. Get a Recommendation</h3>
            <p className="text-stone-400 text-sm">We match you to the right kit and let you customize it.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">📦</div>
            <h3 className="font-semibold text-lg">3. We Pack & Ship</h3>
            <p className="text-stone-400 text-sm">We hand-pack your kit and ship it directly to you.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 text-center text-stone-600 text-sm py-8">
        © {new Date().getFullYear()} BaselineKits. All rights reserved.
      </footer>

    </main>
  );
}
