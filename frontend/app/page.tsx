import Link from 'next/link';
import Navbar from './components/Navbar';

// ─── Tactical Emblem SVG ───────────────────────────────────────────────────
function TacticalEmblem() {
  const cx = 160;
  const cy = 160;

  // Generate tick marks around the ring
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 10) {
    if (deg % 90 === 0) continue; // skip cardinal positions (crosshairs go there)
    const isLarge = deg % 45 === 0;
    const r1 = 128;
    const r2 = isLarge ? 141 : 135;
    const rad = ((deg - 90) * Math.PI) / 180;
    ticks.push({
      x1: cx + r1 * Math.cos(rad), y1: cy + r1 * Math.sin(rad),
      x2: cx + r2 * Math.cos(rad), y2: cy + r2 * Math.sin(rad),
      isLarge, deg,
    });
  }

  // Hexagon vertices (r=92, flat-top)
  const hexPts = Array.from({ length: 6 }, (_, i) => {
    const rad = ((i * 60 - 90) * Math.PI) / 180;
    return `${cx + 92 * Math.cos(rad)},${cy + 92 * Math.sin(rad)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[340px] mx-auto" aria-hidden="true">
      {/* Outer atmosphere */}
      <circle cx={cx} cy={cy} r={148} fill="none" stroke="#1c1917" strokeWidth="0.5" strokeDasharray="3 9" />
      <circle cx={cx} cy={cy} r={136} fill="none" stroke="#292524" strokeWidth="1" />

      {/* Tick marks */}
      {ticks.map(t => (
        <line key={t.deg} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isLarge ? '#57534e' : '#3d3835'} strokeWidth={t.isLarge ? 1.5 : 0.75} />
      ))}

      {/* Cardinal crosshairs */}
      {/* Top */}
      <line x1={cx} y1="8"   x2={cx} y2="38"  stroke="#f97316" strokeWidth="2.5" />
      <circle cx={cx} cy="8"   r="3" fill="#f97316" />
      {/* Bottom */}
      <line x1={cx} y1="282" x2={cx} y2="312" stroke="#f97316" strokeWidth="2.5" />
      <circle cx={cx} cy="312" r="3" fill="#f97316" />
      {/* Left */}
      <line x1="8"   y1={cy} x2="38"  y2={cy} stroke="#f97316" strokeWidth="2.5" />
      <circle cx="8"   cy={cy} r="3" fill="#f97316" />
      {/* Right */}
      <line x1="282" y1={cy} x2="312" y2={cy} stroke="#f97316" strokeWidth="2.5" />
      <circle cx="312" cy={cy} r="3" fill="#f97316" />

      {/* Corner brackets */}
      <path d="M 32,72 L 32,32 L 72,32"   fill="none" stroke="#44403c" strokeWidth="1.5" />
      <path d="M 288,72 L 288,32 L 248,32" fill="none" stroke="#44403c" strokeWidth="1.5" />
      <path d="M 32,248 L 32,288 L 72,288" fill="none" stroke="#44403c" strokeWidth="1.5" />
      <path d="M 288,248 L 288,288 L 248,288" fill="none" stroke="#44403c" strokeWidth="1.5" />

      {/* Hexagon */}
      <polygon points={hexPts} fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.45" />

      {/* Hex corner dots */}
      {Array.from({ length: 6 }, (_, i) => {
        const rad = ((i * 60 - 90) * Math.PI) / 180;
        return <circle key={i} cx={cx + 92 * Math.cos(rad)} cy={cy + 92 * Math.sin(rad)} r="2.5" fill="#f97316" opacity="0.5" />;
      })}

      {/* Inner rings */}
      <circle cx={cx} cy={cy} r="64" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.35" />

      {/* Core */}
      <circle cx={cx} cy={cy} r="46" fill="#0c0c0c" stroke="#f97316" strokeWidth="2" />

      {/* BK monogram */}
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#f97316"
        fontFamily="system-ui, -apple-system, Arial, sans-serif"
        fontWeight="900" fontSize="28" letterSpacing="5">BK</text>
    </svg>
  );
}

// ─── Category Icons ────────────────────────────────────────────────────────
const KIT_CATEGORIES = [
  {
    label: 'Bags & Packs',
    category: 'bag',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M9 2h6l1 4H8L9 2z" />
        <rect x="3" y="6" width="18" height="15" rx="2" />
        <path d="M8 11h8M12 11v5" />
      </svg>
    ),
  },
  {
    label: 'Water & Filtration',
    category: 'water',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 2L6 12a6 6 0 1 0 12 0L12 2z" />
        <path d="M9 16c.5 1 1.5 1.5 3 1.5" />
      </svg>
    ),
  },
  {
    label: 'Emergency Food',
    category: 'food',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M5 8h14M5 13h14M9 18v-5" />
        <circle cx="15" cy="15.5" r="1.5" />
      </svg>
    ),
  },
  {
    label: 'Medical',
    category: 'medical',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    label: 'Tools & Lighting',
    category: 'tools',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l-8 8a1 1 0 0 0 1.4 1.4l8-8a1 1 0 0 0 0-1.4l-.8-.8a4 4 0 0 0-5.6 0L8 9" />
        <path d="M5 20l1.5-1.5M17 3l-1.5 1.5M16 16l3 3" />
        <circle cx="19" cy="19" r="2" />
      </svg>
    ),
  },
  {
    label: 'Shelter',
    category: 'shelter',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M3 18L12 5l9 13H3z" />
        <path d="M9 18v-5h6v5" />
      </svg>
    ),
  },
];

// ─── How-It-Works Icons ────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    num: '01',
    label: 'Answer Questions',
    desc: 'Tell us your use case, duration, and environment.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    num: '02',
    label: 'Get a Recommendation',
    desc: 'We match you to the right kit and let you customize it.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
      </svg>
    ),
  },
  {
    num: '03',
    label: 'We Pack & Ship',
    desc: 'We hand-pack your kit and ship it directly to you.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M5 12H3l9-9 9 9h-2" />
        <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <div>
          <p className="label-tactical text-orange-500 mb-5 tracking-[0.2em]">// Emergency Preparedness System</p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-wide leading-tight uppercase mb-6">
            Your Survival Kit,<br />
            <span className="text-orange-500">Built for You</span>
          </h1>
          <p className="text-stone-400 text-lg leading-relaxed mb-10 max-w-lg">
            Answer a few questions about your situation and we'll assemble a custom kit from quality brands — packed and shipped to your door.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/quiz"
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-4 rounded transition-colors uppercase tracking-widest text-sm"
            >
              Build My Kit →
            </Link>
            <Link
              href="/kits"
              className="border border-stone-600 hover:border-orange-500 hover:text-orange-400 text-stone-300 px-8 py-4 rounded transition-colors uppercase tracking-widest text-sm"
            >
              Browse Kits
            </Link>
          </div>

          {/* Mini trust strip */}
          <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-stone-800">
            {['100% Custom Built', 'Quality Sourced Brands', 'Hand-Packed & Verified'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="label-tactical text-stone-500 tracking-widest">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: emblem */}
        <div className="flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            {/* Glow effect behind emblem */}
            <div className="absolute inset-0 rounded-full bg-orange-500/5 blur-3xl" />
            <TacticalEmblem />
          </div>
        </div>
      </section>

      {/* ── Kit Categories Strip ── */}
      <section className="border-y border-stone-800 bg-stone-900/30">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <p className="label-tactical text-stone-600 text-center mb-8 tracking-[0.2em]">// What's In Every Kit</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {KIT_CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href={`/products?category=${cat.category}`}
                className="flex flex-col items-center gap-3 p-4 rounded border border-stone-800 hover:border-orange-500/40 hover:bg-stone-900 transition-all group text-center"
              >
                <span className="text-stone-500 group-hover:text-orange-400 transition-colors">
                  {cat.icon}
                </span>
                <span className="label-tactical text-stone-600 group-hover:text-stone-400 transition-colors tracking-wider leading-tight">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <p className="label-tactical text-stone-500 text-center mb-3 tracking-[0.2em]">// Procedure</p>
        <h2 className="text-3xl font-bold text-center mb-16 uppercase tracking-wider">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {HOW_STEPS.map((step, i) => (
            <div key={step.num} className="relative bg-stone-900/60 border border-stone-800 rounded p-8 flex flex-col gap-4">
              {/* Connector line (not on last) */}
              {i < 2 && (
                <div className="hidden sm:block absolute top-1/2 -right-2 w-4 h-px bg-stone-800 z-10" />
              )}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded border border-orange-500/40 flex items-center justify-center text-orange-500 shrink-0">
                  {step.icon}
                </div>
                <span className="label-tactical text-orange-500/60 text-lg font-bold">{step.num}</span>
              </div>
              <h3 className="font-bold text-lg uppercase tracking-wider">{step.label}</h3>
              <p className="text-stone-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-stone-800 bg-stone-900/20">
        <div className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              title: 'Sourced from Trusted Brands',
              desc: "We don't manufacture — we curate. Every item comes from established gear and supply companies and is hand-selected for reliability.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ),
            },
            {
              title: 'Tailored to Your Needs',
              desc: 'No generic kits. Every order starts with your answers — your scenario, your environment, your duration — and is built from there.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              ),
            },
            {
              title: 'Packed & Shipped Fast',
              desc: 'Once you place your order, we hand-pack and verify your kit before it ships. Every item is checked before it leaves our facility.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <rect x="1" y="3" width="15" height="13" rx="1" />
                  <path d="M16 8h4l3 5v3h-7V8z" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              ),
            },
          ].map(f => (
            <div key={f.title} className="flex flex-col gap-4 p-6 border border-stone-800 rounded bg-stone-900/40">
              <span className="text-orange-500">{f.icon}</span>
              <h3 className="font-bold text-base uppercase tracking-wider">{f.title}</h3>
              <p className="text-stone-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="label-tactical text-orange-500 mb-4 tracking-[0.2em]">// Ready?</p>
        <h2 className="text-4xl font-extrabold uppercase tracking-wide mb-4">Build Your Baseline</h2>
        <p className="text-stone-400 mb-8 text-lg">Two minutes. Zero guesswork. A kit built for exactly your situation.</p>
        <Link
          href="/quiz"
          className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-bold px-10 py-5 rounded transition-colors uppercase tracking-widest text-sm"
        >
          Start the Assessment →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 text-center text-stone-600 text-xs py-8 tracking-widest uppercase">
        © {new Date().getFullYear()} BaselineKits. All rights reserved.
      </footer>
    </main>
  );
}
