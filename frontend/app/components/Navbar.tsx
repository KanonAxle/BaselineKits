'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, removeToken } from '../../lib/api';

export default function Navbar() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getToken());
  }, []);

  function handleLogout() {
    removeToken();
    setLoggedIn(false);
    router.push('/');
  }

  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-800">
      {/* Left: Logo + nav links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold tracking-tight hover:text-orange-500 transition-colors">
          BaselineKits
        </Link>
        <Link href="/quiz" className="text-stone-400 hover:text-white transition-colors text-sm">
          Build My Kit
        </Link>
        <Link href="/products" className="text-stone-400 hover:text-white transition-colors text-sm">
          Products
        </Link>
        <Link href="/track" className="text-stone-400 hover:text-white transition-colors text-sm">
          Track Order
        </Link>
      </div>

      {/* Right: Auth */}
      <div className="flex items-center gap-4">
        {loggedIn ? (
          <>
            <Link href="/account" className="text-stone-400 hover:text-white transition-colors text-sm">
              My Account
            </Link>
            <button
              onClick={handleLogout}
              className="border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white text-sm px-4 py-2 rounded-md transition-colors"
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-stone-400 hover:text-white transition-colors text-sm">
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-4 py-2 rounded-md transition-colors"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
