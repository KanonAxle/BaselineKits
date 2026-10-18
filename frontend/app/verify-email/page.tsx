'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resendVerificationEmail, saveToken, verifyEmail } from '../../lib/api';
import Navbar from '../components/Navbar';

function safeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/account';
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nextPath, setNextPath] = useState('/account');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const verificationStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const returnPath = safeNextPath(params.get('next'));
    setEmail(params.get('email') || '');
    setNextPath(returnPath);
    if (params.get('email_sent') === 'false') {
      setMessage('We could not send the verification email automatically. Use the button below to request another one.');
    }

    if (!token) {
      setLoading(false);
      return;
    }
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    verifyEmail(token)
      .then(result => {
        saveToken(result.token);
        router.replace(returnPath);
      })
      .catch((verificationError: unknown) => {
        setError(verificationError instanceof Error ? verificationError.message : 'Unable to verify your email.');
        setLoading(false);
      });
  }, [router]);

  async function resend() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await resendVerificationEmail(email, nextPath);
      setMessage(result.message);
    } catch (resendError: unknown) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to send a verification email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
        <section className="w-full max-w-md rounded-xl border border-stone-800 bg-stone-900 p-8">
          <h1 className="mb-2 text-2xl font-bold">Verify your email</h1>
          {loading ? (
            <p className="mt-6 text-sm text-stone-400">Checking your verification link...</p>
          ) : (
            <>
              <p className="mb-6 text-sm text-stone-400">
                {message || `Check your inbox for a verification link${email ? ` sent to ${email}` : ''}. You need to verify your address before signing in or checking out.`}
              </p>
              {email && (
                <button onClick={resend} disabled={loading} className="w-full rounded-lg bg-orange-600 py-3 font-semibold transition-colors hover:bg-orange-500 disabled:opacity-40">
                  Send another verification email
                </button>
              )}
              {message && <p role="status" className="mt-4 text-sm text-green-400">{message}</p>}
              {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
              <p className="mt-6 text-center text-sm text-stone-500">
                <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-orange-500 hover:text-orange-400">Return to log in</Link>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
