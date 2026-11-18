import Link from 'next/link';
import Image from 'next/image';
import Navbar from './components/Navbar';
import SiteFooter from './components/SiteFooter';
import FeatureColumns from './components/FeatureColumns';

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

// ─── Photo Banner ──────────────────────────────────────────────────────────
const BANNER_PHOTOS = [
  { src: '/landing/banner-1.jpg', alt: 'Open survival backpack with water, first aid, and flashlight' },
  { src: '/landing/banner-2.jpg', alt: 'Hands packing emergency supplies into a kit bag' },
  { src: '/landing/banner-3.jpg', alt: 'Emergency supplies laid out: water bottle, crank flashlight, first aid kit' },
  { src: '/landing/banner-4.jpg', alt: 'Hiker walking a forest trail at dusk with a loaded backpack' },
  { src: '/landing/banner-5.jpg', alt: 'Car trunk at dusk with an organized emergency kit' },
  { src: '/landing/banner-6.jpg', alt: 'Hand holding a crank flashlight in the dark' },
];

// ─── How It Works ──────────────────────────────────────────────────────────
const STAGES = [
  {
    verb: 'Answer',
    img: '/landing/process-answer.jpg',
    sentence: 'Tell us your use case, duration, and environment — two minutes of plain questions.',
  },
  {
    verb: 'Pack',
    img: '/landing/process-pack.jpg',
    sentence: 'We match you to the right kit, you customize it, and we hand-pack every item.',
  },
  {
    verb: 'Ship',
    img: '/landing/process-ship.jpg',
    sentence: 'Verified, sealed, and shipped straight to your door.',
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "BaselineKits",
          url: "https://www.baselinekits.com",
          logo: "https://www.baselinekits.com/baselinekits-logo.png",
          description: "Custom survival kits built from quality brands, hand-packed and shipped to your door.",
          parentOrganization: {
            "@type": "Organization",
            name: "Harrington Innovations LLC",
          },
        }),
      }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "BaselineKits",
          url: "https://www.baselinekits.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.baselinekits.com/products?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      }}
    />
      <Navbar />

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <div>
          <p className="label-tactical text-orange-500 mb-5 tracking-[0.2em]">{"// Emergency Preparedness System"}</p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-wide leading-tight uppercase mb-6">
            Your Survival Kit,<br />
            <span className="text-orange-500">Built for You</span>
          </h1>
          <p className="text-stone-400 text-lg leading-relaxed mb-10 max-w-lg">
            Answer a few questions about your situation and we&rsquo;ll assemble a custom kit from quality brands — packed and shipped to your door.
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
                <span className="label-tactical text-stone-400 tracking-widest">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: lifestyle hero image */}
        <div className="flex items-center justify-center lg:justify-end">
          <Image
            src="/hero-kit.jpg"
            alt="Hand-packed emergency survival kit with water filter, first aid supplies, flashlight, paracord, and food rations"
            width={1200}
            height={800}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="h-auto w-full max-w-xl rounded"
          />
        </div>
      </section>

      {/* ── Auto-scrolling photo banner (full bleed) ── */}
      <section aria-label="Kit life photographs" className="banner-section relative overflow-hidden bg-stone-950">
        <p className="label-tactical absolute left-6 top-6 z-10 tracking-[0.2em] text-stone-400">
          {"// Kit Life"} <span className="text-stone-500">· 6 photographs</span>
        </p>
        <div className="banner-track flex w-max items-center py-16 sm:py-20">
          {[...BANNER_PHOTOS, ...BANNER_PHOTOS].map((photo, i) => (
            <div
              key={i}
              aria-hidden={i >= BANNER_PHOTOS.length}
              className="relative mr-[5vw] aspect-[3/4] w-[34vw] shrink-0 overflow-hidden sm:w-[11vw]"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 640px) 34vw, 11vw"
                className="object-cover brightness-[0.85] contrast-[1.05]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Kit Categories Strip ── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="label-tactical text-stone-400 text-center mb-10 tracking-[0.2em]">{"// What's In Every Kit"}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {KIT_CATEGORIES.map(cat => (
            <Link
              key={cat.label}
              href={`/products?category=${cat.category}`}
              className="flex flex-col items-center gap-3 p-2 text-center group"
            >
              <span className="text-stone-500 group-hover:text-orange-400 transition-colors">
                {cat.icon}
              </span>
              <span className="label-tactical text-stone-400 group-hover:text-white transition-colors tracking-wider leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features: one-size name columns ── */}
      <FeatureColumns />

      {/* ── How It Works: one verb at a time (full bleed) ── */}
      {STAGES.map((stage, i) => (
        <section key={stage.verb} aria-label={`Step ${i + 1}: ${stage.verb}`} className="relative h-[125svh] overflow-hidden">
          <Image
            src={stage.img}
            alt={stage.sentence}
            fill
            sizes="100vw"
            className="object-cover brightness-[0.55] contrast-[1.05]"
          />
          <div className="sticky top-[42svh]">
            <h2 className="px-6 text-[clamp(72px,15vw,260px)] font-extrabold uppercase leading-none tracking-wide text-white">
              {stage.verb}
            </h2>
          </div>
          <p className="absolute bottom-8 left-6 max-w-md rounded bg-stone-950/80 px-4 py-3 text-base leading-relaxed text-stone-200">
            {stage.sentence}
          </p>
        </section>
      ))}

      {/* ── CTA: the object returns ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center lg:grid-cols-12">
          {/* Image: over-scaled, cropped by the section edges */}
          <div className="order-2 lg:order-1 lg:col-span-8 lg:-ml-[12%] lg:-mb-[14%]">
            <Image
              src="/hero-kit.jpg"
              alt="Your kit, hand-packed and ready to ship"
              width={1200}
              height={800}
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="h-auto w-full"
            />
          </div>
          {/* Text */}
          <div className="order-1 px-6 pt-20 lg:order-2 lg:col-span-4 lg:py-32">
            <h2 className="text-4xl font-extrabold uppercase tracking-wide leading-tight">Build Your Baseline</h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-stone-400">
              Two minutes of questions. A kit built for exactly your situation — packed, verified, and shipped.
            </p>
            <p className="mt-6 label-tactical tracking-widest text-stone-400">Free shipping · Hand-packed in the USA</p>
            <Link
              href="/quiz"
              className="mt-8 inline-block bg-orange-600 hover:bg-orange-500 text-white font-bold px-10 py-5 rounded transition-colors uppercase tracking-widest text-sm"
            >
              Start the Assessment →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </main>
  );
}
