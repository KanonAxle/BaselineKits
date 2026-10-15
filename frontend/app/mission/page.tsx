import Link from 'next/link';
import Navbar from '../components/Navbar';

const PRINCIPLES = [
  {
    num: '01',
    title: 'Quality Over Quantity',
    desc: 'Every item in a BaselineKits build is chosen for reliability under pressure. We source from established gear brands — not the cheapest available option.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Built for Your Situation',
    desc: "Generic kits assume generic emergencies. We ask about your environment, duration, and household so the kit we build actually fits your threat model — not someone else's.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'No Filler, No Fluff',
    desc: "We don't pad kits to inflate perceived value. If an item isn't genuinely useful in an emergency, it doesn't ship. You pay for gear, not packaging.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Verified Before It Ships',
    desc: 'Every kit is hand-packed and checked item by item before it leaves our facility. No automated fulfillment shortcuts.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
];

const STATS = [
  { value: '72 hrs', label: 'Minimum prep standard we build toward' },
  { value: '6', label: 'Core supply categories in every kit' },
  { value: '0', label: 'Pre-packed generic kits — everything is built to order' },
];

export default function MissionPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />

      {/* ── Header ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <p className="label-tactical text-orange-500 mb-4 tracking-[0.2em]">// Why We Exist</p>
        <h1 className="text-5xl lg:text-6xl font-extrabold uppercase tracking-wide leading-tight mb-6">
          Our Mission
        </h1>
        <p className="text-stone-400 text-xl leading-relaxed max-w-2xl">
          Most people know they should be prepared. Almost none of them are.
          BaselineKits exists to close that gap — by removing the research, the guesswork,
          and the time it takes to build a kit that actually works.
        </p>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-stone-800" />

      {/* ── The Problem ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="label-tactical text-stone-500 mb-3 tracking-[0.2em]">// The Problem</p>
            <h2 className="text-3xl font-bold uppercase tracking-wider mb-6">Preparedness Shouldn&apos;t Require a Degree</h2>
            <p className="text-stone-400 leading-relaxed mb-4">
              The emergency preparedness market is flooded with generic, low-quality kits stuffed with
              items that look impressive on the shelf and fail in the field. Building your own kit from
              scratch means hours of research, cross-referencing gear reviews, and hoping you didn&apos;t
              miss something critical.
            </p>
            <p className="text-stone-400 leading-relaxed">
              We built BaselineKits because that process shouldn&apos;t be that hard. Answer a
              few targeted questions. Get a kit built for your specific situation. Done.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {STATS.map(s => (
              <div key={s.label} className="bg-stone-900/60 border border-stone-800 rounded p-6">
                <div className="text-4xl font-extrabold text-orange-500 mb-2">{s.value}</div>
                <div className="label-tactical text-stone-500 tracking-wider leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-stone-800 bg-stone-900/20">
        {/* ── Principles ── */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <p className="label-tactical text-stone-500 mb-3 tracking-[0.2em]">// How We Operate</p>
          <h2 className="text-3xl font-bold uppercase tracking-wider mb-12">Our Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PRINCIPLES.map(p => (
              <div key={p.num} className="bg-stone-900/60 border border-stone-800 rounded p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded border border-orange-500/40 flex items-center justify-center text-orange-500 shrink-0">
                    {p.icon}
                  </div>
                  <span className="label-tactical text-orange-500/60 text-lg font-bold">{p.num}</span>
                </div>
                <h3 className="font-bold text-base uppercase tracking-wider">{p.title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="label-tactical text-orange-500 mb-4 tracking-[0.2em]">// Ready to Start?</p>
        <h2 className="text-4xl font-extrabold uppercase tracking-wide mb-4">Build Your Baseline</h2>
        <p className="text-stone-400 mb-8 text-lg">Two minutes. Zero guesswork. A kit built for exactly your situation.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/quiz"
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-10 py-4 rounded transition-colors uppercase tracking-widest text-sm"
          >
            Start the Assessment →
          </Link>
          <Link
            href="/contact"
            className="border border-stone-600 hover:border-orange-500 hover:text-orange-400 text-stone-300 px-10 py-4 rounded transition-colors uppercase tracking-widest text-sm"
          >
            Contact Us
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-800 text-center text-stone-600 text-xs py-8 tracking-widest uppercase">
        © {new Date().getFullYear()} BaselineKits. All rights reserved.
      </footer>
    </main>
  );
}
