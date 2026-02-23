'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, saveToken } from '../../lib/api';
import Navbar from '../components/Navbar';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await register(email, password, name);
      saveToken(data.token);
      router.push('/account');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 mb-4">
            <h1 className="text-2xl font-bold mb-2">Create Account</h1>
            <p className="text-stone-400 text-sm mb-8">Track all your orders in one place</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-stone-400 mb-1 block">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                  placeholder="John Smith" />
              </div>
              <div>
                <label className="text-sm text-stone-400 mb-1 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-sm text-stone-400 mb-1 block">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                  placeholder="••••••••" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors mt-2">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-stone-500 text-sm text-center mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-500 hover:text-orange-400">Log in</Link>
            </p>
          </div>

          {/* Guest option */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 text-center">
            <p className="text-stone-400 text-sm mb-3">No account needed to place an order.</p>
            <Link href="/quiz"
              className="border border-stone-700 hover:border-orange-500 text-stone-300 hover:text-white text-sm px-5 py-2 rounded-lg transition-colors">
              Build My Kit Without an Account →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
