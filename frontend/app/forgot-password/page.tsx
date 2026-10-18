'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestPasswordReset } from '../../lib/api';
import Navbar from '../components/Navbar';

function getNextPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('next');
  return requestedPath?.startsWith('/') && !requestedPath.startsWith('//') && !requestedPath.includes('\\') ? requestedPath : '/account';
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await requestPasswordReset(email, getNextPath());
      setMessage(result.message);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request a password reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
        <section className="w-full max-w-md rounded-xl border border-stone-800 bg-stone-900 p-8">
          <h1 className="mb-2 text-2xl font-bold">Reset your password</h1>
          <p className="mb-8 text-sm text-stone-400">Enter your account email and we’ll send password reset instructions if an account exists.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="text-sm text-stone-400">
              Email
              <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-3 text-white" />
            </label>
            {message && <p role="status" className="text-sm text-green-400">{message}</p>}
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="mt-2 rounded-lg bg-orange-600 py-3 font-semibold transition-colors hover:bg-orange-500 disabled:opacity-40">
              {loading ? 'Sending...' : 'Send reset instructions'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-stone-500">
            <Link
              href="/login"
              onClick={event => {
                event.preventDefault();
                router.push(`/login?next=${encodeURIComponent(getNextPath())}`);
              }}
              className="text-orange-500 hover:text-orange-400"
            >Back to log in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
