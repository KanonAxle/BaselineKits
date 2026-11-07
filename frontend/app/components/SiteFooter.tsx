import Link from "next/link";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { label: "Build My Kit", href: "/quiz" },
      { label: "Browse Kits", href: "/kits" },
      { label: "Products", href: "/products" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Education Hub", href: "/education" },
      { label: "Our Mission", href: "/mission" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Track Order", href: "/track" },
      { label: "Sizing Guide", href: "/sizing" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Use", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-stone-800 bg-stone-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link
              href="/"
              className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors"
            >
              BaselineKits
            </Link>
            <p className="text-stone-500 text-sm leading-relaxed mt-3">
              Custom survival kits built from your answers — hand-packed and shipped to your door.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="label-tactical text-stone-500 tracking-widest mb-3">{'// '}{col.heading}</p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-800 mt-10 pt-6 text-center text-stone-600 text-xs py-2 tracking-widest uppercase">
          © {new Date().getFullYear()} BaselineKits. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
