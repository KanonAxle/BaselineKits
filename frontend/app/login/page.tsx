// @ts-nocheck
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, saveToken } from '../../lib/api';
import Navbar from '../components/Navbar';

function getNextPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('next');
  return requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/account';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password, rememberMe);
      saveToken(data.token);
      router.push(getNextPath());
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your email and password.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 mb-4">
            <h1 className="text-2xl font-bold mb-2">Log In</h1>
            <p className="text-stone-400 text-sm mb-8">Welcome back to BaselineKits</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-stone-400 mb-1 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-sm text-stone-400 mb-1 block">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                  placeholder="••••••••" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-600 bg-stone-800 accent-orange-500 cursor-pointer"
                />
                <span className="text-stone-400 text-sm">Remember me for 30 days</span>
              </label>
              <button type="submit" disabled={loading}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors mt-2">
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <p className="text-stone-500 text-sm text-center mt-6">
              Don't have an account?{' '}
              <Link
                href="/register"
                onClick={event => {
                  event.preventDefault();
                  router.push(`/register?next=${encodeURIComponent(getNextPath())}`);
                }}
                className="text-orange-500 hover:text-orange-400"
              >Sign up</Link>
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
