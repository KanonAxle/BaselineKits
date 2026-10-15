'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';

const CONTACT_REASONS = [
  'Order Issue',
  'Product Question',
  'Kit Recommendation',
  'Returns & Exchanges',
  'Wholesale / Bulk Orders',
  'Other',
];

function ContactContent() {
  const searchParams = useSearchParams();
  const fromQuiz = searchParams.get('from') === 'quiz';
  const [form, setForm] = useState({ name: '', email: '', reason: fromQuiz ? 'Kit Recommendation' : '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!fromQuiz) return;
    const summary = localStorage.getItem('quizContactSummary');
    if (summary) {
      setForm(f => ({ ...f, message: `My quiz answers:\n\n${summary}\n\n---\nAdditional notes: ` }));
      localStorage.removeItem('quizContactSummary');
    }
  }, [fromQuiz]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Simulate submission delay — wire up to backend/email service when ready
    await new Promise(r => setTimeout(r, 800));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* Quiz referral banner */}
        {fromQuiz && (
          <div className="mb-10 bg-orange-500/10 border border-orange-500/30 rounded px-5 py-4 flex items-start gap-3">
            <div className="text-orange-500 mt-0.5 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="label-tactical text-orange-400 mb-1 tracking-widest">// Your situation needs a custom recommendation</p>
              <p className="text-stone-300 text-sm leading-relaxed">
                Our standard kits may not be the best fit for your needs. Fill out the form below and we&apos;ll
                help you find the right solution — or build something custom.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* ── Left: Info ── */}
          <div>
            <p className="label-tactical text-orange-500 mb-4 tracking-[0.2em]">// Get in Touch</p>
            <h1 className="text-5xl font-extrabold uppercase tracking-wide leading-tight mb-6">
              Contact Us
            </h1>
            <p className="text-stone-400 text-lg leading-relaxed mb-10">
              Questions about an order, a product, or building the right kit for your situation?
              We&apos;re here to help.
            </p>

            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <p className="label-tactical text-stone-500 mb-1">Email</p>
                  <p className="text-stone-300 text-sm">support@baselinekits.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                </div>
                <div>
                  <p className="label-tactical text-stone-500 mb-1">Response Time</p>
                  <p className="text-stone-300 text-sm">Within 1–2 business days</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="label-tactical text-stone-500 mb-1">Order Tracking</p>
                  <p className="text-stone-300 text-sm">
                    Use the{' '}
                    <Link href="/track" className="text-orange-500 hover:text-orange-400 transition-colors">
                      Track Order
                    </Link>
                    {' '}page for real-time order status.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div>
            {submitted ? (
              <div className="bg-stone-900/60 border border-orange-500/30 rounded p-8 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full border border-orange-500/40 flex items-center justify-center text-orange-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <p className="label-tactical text-orange-500 tracking-[0.15em]">// Message Received</p>
                <h2 className="text-2xl font-bold uppercase tracking-wide">We&apos;ll Be in Touch</h2>
                <p className="text-stone-400 text-sm leading-relaxed">
                  Thanks for reaching out. Expect a reply within 1–2 business days.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', reason: '', message: '' }); }}
                  className="mt-2 label-tactical text-stone-500 hover:text-orange-400 transition-colors tracking-widest border border-stone-700 hover:border-orange-500/50 px-4 py-2 rounded text-xs"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <div className="bg-stone-900/60 border border-stone-800 rounded p-8">
                <p className="label-tactical text-orange-500 mb-6 tracking-[0.15em]">// Send a Message</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label-tactical text-stone-500 mb-1 block">Name *</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your name"
                        className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="label-tactical text-stone-500 mb-1 block">Email *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@example.com"
                        className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-tactical text-stone-500 mb-1 block">Reason</label>
                    <select
                      value={form.reason}
                      onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                      className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
                    >
                      <option value="">Select a topic...</option>
                      {CONTACT_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label-tactical text-stone-500 mb-1 block">Message *</label>
                    <textarea
                      required
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={5}
                      placeholder="How can we help?"
                      className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-6 py-4 rounded transition-colors uppercase tracking-widest text-xs"
                  >
                    {submitting ? 'Sending...' : 'Send Message →'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-stone-800 text-center text-stone-600 text-xs py-8 tracking-widest uppercase">
        © {new Date().getFullYear()} BaselineKits. All rights reserved.
      </footer>
    </main>
  );
}

export default function ContactPage() {
  return (
    <Suspense>
      <ContactContent />
    </Suspense>
  );
}
