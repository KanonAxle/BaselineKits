'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { completePasswordReset } from '../../lib/api';
import Navbar from '../components/Navbar';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [nextPath, setNextPath] = useState('/account');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
    const requestedPath = params.get('next');
    setNextPath(requestedPath?.startsWith('/') && !requestedPath.startsWith('//') && !requestedPath.includes('\\') ? requestedPath : '/account');
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('This password reset link is invalid. Request a new one.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError('Password must be no longer than 72 UTF-8 bytes.');
      return;
    }

    setLoading(true);
    try {
      const result = await completePasswordReset(token, password);
      setMessage(result.message);
    } catch (resetError: unknown) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
        <section className="w-full max-w-md rounded-xl border border-stone-800 bg-stone-900 p-8">
          <h1 className="mb-2 text-2xl font-bold">Choose a new password</h1>
          <p className="mb-8 text-sm text-stone-400">Your password must be at least 6 characters long.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="text-sm text-stone-400">
              New password
              <input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-stone-400">
              Confirm new password
              <input type="password" autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-3 text-white" />
            </label>
            {message && <p role="status" className="text-sm text-green-400">{message}</p>}
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            {!message && <button type="submit" disabled={loading} className="mt-2 rounded-lg bg-orange-600 py-3 font-semibold transition-colors hover:bg-orange-500 disabled:opacity-40">
              {loading ? 'Updating...' : 'Update password'}
            </button>}
          </form>
          {message && <p className="mt-6 text-center text-sm text-stone-500">
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-orange-500 hover:text-orange-400">Continue to log in</Link>
          </p>}
        </section>
      </div>
    </main>
  );
}
