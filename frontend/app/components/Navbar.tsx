'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, removeToken } from '../../lib/api';
import { useCart } from '../../lib/cartContext';

const LEARN_LINKS = [
  { href: '/education', label: 'Education', desc: 'Why we build kits the way we do' },
  { href: '/mission', label: 'Mission', desc: 'What BaselineKits stands for' },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const learnRef = useRef<HTMLDivElement>(null);
  const { totalCount } = useCart();
  const learnActive = LEARN_LINKS.some(link => pathname.startsWith(link.href));

  useEffect(() => {
    setLoggedIn(!!getToken());
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setLearnOpen(false);
  }, [pathname]);

  function handleLogout() {
    removeToken();
    setLoggedIn(false);
    router.push('/');
  }

  return (
    <nav className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        {/* Left: Logo + nav links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">
            BaselineKits
          </Link>
          <div className="hidden items-center gap-5 xl:gap-6 lg:flex">
            <Link href="/quiz" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold">
              Build My Kit
            </Link>
            <Link href="/kits" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold">
              Kits
            </Link>
            <Link href="/products" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold">
              Products
            </Link>
            <div
              ref={learnRef}
              className="relative"
              onMouseEnter={() => setLearnOpen(true)}
              onMouseLeave={() => setLearnOpen(false)}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setLearnOpen(false);
              }}
              onKeyDown={event => {
                if (event.key === 'Escape') setLearnOpen(false);
              }}
            >
              <button
                type="button"
                onClick={() => setLearnOpen(v => !v)}
                aria-expanded={learnOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1 transition-colors text-xs uppercase tracking-widest font-semibold ${
                  learnActive ? 'text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                Learn
                <svg className={`w-3 h-3 transition-transform ${learnOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
              {learnOpen && (
                <div className="absolute left-0 top-full pt-3 z-50">
                  <div className="w-64 rounded-lg border border-stone-800 bg-stone-950 shadow-xl p-2">
                    {LEARN_LINKS.map(link => (
                      <Link key={link.href} href={link.href} onClick={() => setLearnOpen(false)} className="block rounded px-3 py-3 hover:bg-stone-900 transition-colors">
                        <span className="block text-xs uppercase tracking-widest font-semibold text-white">{link.label}</span>
                        <span className="block text-xs text-stone-500 mt-1 normal-case tracking-normal">{link.desc}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link href="/contact" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold">
              Contact
            </Link>
          </div>
        </div>

        {/* Right: Cart + Auth + hamburger */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cart icon */}
          <Link href="/cart" className="relative p-2 text-stone-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {totalCount > 9 ? '9+' : totalCount}
              </span>
            )}
          </Link>
          <div className="hidden items-center gap-4 lg:flex">
            {loggedIn ? (
              <>
                <Link href="/account" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold">
                  My Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="border border-stone-700 hover:border-orange-500 text-stone-300 hover:text-orange-400 text-xs uppercase tracking-widest font-semibold px-4 py-2 rounded transition-colors"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold">
                  Log In
                </Link>
                <Link href="/register" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold">
                  Create Account
                </Link>
              </>
            )}
          </div>

          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded border border-stone-700 lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            <span className={`block w-5 h-px bg-stone-400 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-px bg-stone-400 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-stone-400 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div id="mobile-navigation" className="border-t border-stone-800 bg-stone-950 px-4 py-4 flex flex-col gap-2 sm:px-8 lg:hidden">
          <Link href="/quiz" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
            Build My Kit
          </Link>
          <Link href="/kits" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
            Kits
          </Link>
          <Link href="/products" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
            Products
          </Link>
          {LEARN_LINKS.map(link => (
            <Link key={link.href} href={link.href} className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
              {link.label}
            </Link>
          ))}
          <Link href="/contact" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
            Contact
          </Link>
          <Link href="/cart" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2 flex items-center gap-2">
            Cart
            {totalCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                {totalCount}
              </span>
            )}
          </Link>
          <div className="border-t border-stone-800 pt-4 mt-2 flex flex-col gap-3">
            {loggedIn ? (
              <>
                <Link href="/account" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
                  My Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left border border-stone-700 hover:border-orange-500 text-stone-300 hover:text-orange-400 text-xs uppercase tracking-widest font-semibold px-4 py-2 rounded transition-colors"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
                  Log In
                </Link>
                <Link href="/register" className="text-stone-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-semibold py-2">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
