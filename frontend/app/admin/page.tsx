// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminQuizPage from './quiz/page';
import {
  adminLogin,
  saveAdminToken,
  getAdminToken,
  removeAdminToken,
  adminGetRecommendationWeights,
  adminUpdateRecommendationWeights,
} from '../../lib/api';

function RecommendationWeightsPanel() {
  const [weights, setWeights] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadWeights() {
      try {
        const data = await adminGetRecommendationWeights();
        setWeights(data || {});
      } catch (err) {
        setError('Unable to load recommendation weights.');
      } finally {
        setLoading(false);
      }
    }

    loadWeights();
  }, []);

  function updateWeight(questionKey, optionLabel, value) {
    setWeights((current) => ({
      ...current,
      [questionKey]: {
        ...(current[questionKey] || {}),
        [optionLabel]: Number(value || 0),
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      await adminUpdateRecommendationWeights(weights);
    } catch (err) {
      setError('Unable to save weights.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded border border-stone-800 bg-stone-900/80 p-6 text-stone-400">Loading weights...</div>;
  }

  return (
    <div className="rounded border border-stone-800 bg-stone-900/80 p-6">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Recommendation Tuning</p>
          <h3 className="text-2xl font-extrabold uppercase tracking-wide">Quiz Scoring Weights</h3>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-3 rounded transition-colors"
        >
          {saving ? 'Saving...' : 'Save Weights'}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="space-y-6">
        {Object.entries(weights).map(([questionKey, optionMap]) => (
          <div key={questionKey} className="rounded border border-stone-800 bg-stone-950/60 p-4">
            <p className="label-tactical text-orange-500 mb-3 tracking-[0.2em]">{questionKey}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(optionMap || {}).map(([optionLabel, value]) => (
                <label key={`${questionKey}-${optionLabel}`} className="block rounded border border-stone-800 bg-stone-900 px-3 py-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">{optionLabel}</span>
                  <input
                    type="number"
                    min="0"
                    value={Number(value || 0)}
                    onChange={(e) => updateWeight(questionKey, optionLabel, e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getAdminToken());
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await adminLogin(password);
      saveAdminToken(data.token);
      setLoggedIn(true);
    } catch {
      setError('Invalid admin password.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    removeAdminToken();
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <p className="label-tactical text-orange-500 mb-3 tracking-[0.2em]">// Admin Access</p>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide mb-8">BaselineKits Admin</h1>

          <div className="bg-stone-900/80 border border-stone-800 rounded p-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="label-tactical text-stone-500 mb-2 block">Admin Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                  placeholder="Enter admin password"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest py-3 rounded transition-colors mt-2"
              >
                {loading ? 'Verifying...' : 'Enter Admin Panel →'}
              </button>
            </form>
          </div>
          <div className="mt-6 text-center">
            <Link href="/" className="label-tactical text-stone-600 hover:text-stone-400 transition-colors tracking-widest">← Back to Site</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <span className="text-sm font-extrabold uppercase tracking-[0.18em]">BaselineKits</span>
          <span className="label-tactical text-orange-500 tracking-widest">// Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">View Site</Link>
          <button
            onClick={handleLogout}
            className="border border-stone-700 hover:border-red-500 text-stone-400 hover:text-red-400 text-xs uppercase tracking-widest font-semibold px-4 py-2 rounded transition-colors"
          >
            Log Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="label-tactical text-orange-500 mb-3 tracking-[0.2em]">// Control Center</p>
        <h1 className="text-4xl font-extrabold uppercase tracking-wide mb-10">Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="relative bg-stone-900/80 border border-stone-800 hover:border-orange-500/50 rounded p-8 flex flex-col gap-4 transition-colors group">
            <Link
              href="/admin/products"
              aria-label="Manage Products"
              className="absolute inset-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
            />
            <div className="relative z-10 pointer-events-none flex flex-col gap-4">
              <div className="w-10 h-10 rounded border border-orange-500/40 flex items-center justify-center text-orange-500 font-bold text-lg">P</div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wider mb-2 group-hover:text-orange-400 transition-colors">Manage Products</h2>
                <p className="text-stone-400 text-sm leading-relaxed">Manage private inventory used to assemble kits. Control pricing, stock status, descriptions, and optional public visibility.</p>
              </div>
              <span className="label-tactical text-orange-500 group-hover:text-orange-400 tracking-widest">Open →</span>
            </div>
            <Link
              href="/admin/catalog"
              className="relative z-20 self-start label-tactical text-stone-500 hover:text-orange-400 underline underline-offset-4 tracking-wider"
            >
              View Private Product Catalog
            </Link>
          </div>

          <Link
            href="/admin/quiz"
            className="bg-stone-900/80 border border-stone-800 hover:border-orange-500/50 rounded p-8 flex flex-col gap-4 transition-colors group"
          >
            <div className="w-10 h-10 rounded border border-orange-500/40 flex items-center justify-center text-orange-500 font-bold text-lg">Q</div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider mb-2 group-hover:text-orange-400 transition-colors">Edit Questionnaire</h2>
              <p className="text-stone-400 text-sm leading-relaxed">Modify quiz questions and answers. Map answers to kit recommendations to control what customers receive.</p>
            </div>
            <span className="label-tactical text-orange-500 group-hover:text-orange-400 tracking-widest">Open →</span>
          </Link>

          <Link
            href="/admin/kits"
            className="bg-stone-900/80 border border-stone-800 hover:border-orange-500/50 rounded p-8 flex flex-col gap-4 transition-colors group"
          >
            <div className="w-10 h-10 rounded border border-orange-500/40 flex items-center justify-center text-orange-500 font-bold text-lg">K</div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider mb-2 group-hover:text-orange-400 transition-colors">Manage Kits</h2>
              <p className="text-stone-400 text-sm leading-relaxed">Build and edit kit bundles from your product catalog. Set contents, quantities, and assign kits to quiz outcomes.</p>
            </div>
            <span className="label-tactical text-orange-500 group-hover:text-orange-400 tracking-widest">Open →</span>
          </Link>

          <Link
            href="/admin/orders"
            className="bg-stone-900/80 border border-stone-800 hover:border-orange-500/50 rounded p-8 flex flex-col gap-4 transition-colors group"
          >
            <div className="w-10 h-10 rounded border border-orange-500/40 flex items-center justify-center text-orange-500 font-bold text-lg">O</div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider mb-2 group-hover:text-orange-400 transition-colors">Orders</h2>
              <p className="text-stone-400 text-sm leading-relaxed">View all orders, manage statuses, and create phone orders with Stripe payment links to send to customers.</p>
            </div>
            <span className="label-tactical text-orange-500 group-hover:text-orange-400 tracking-widest">Open →</span>
          </Link>
        </div>

        <div className="mt-12 border-t border-stone-800 pt-10 space-y-10">
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Recommendation Control</p>
              <h2 className="text-3xl font-extrabold uppercase tracking-wide">Scoring & Quiz Logic</h2>
            </div>
            <Link
              href="/admin/quiz"
              className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest border border-stone-700 hover:border-stone-500 px-3 py-2 rounded"
            >
              Open Full Editor →
            </Link>
          </div>

          <RecommendationWeightsPanel />

          <div>
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Questionnaire Control</p>
                <h2 className="text-3xl font-extrabold uppercase tracking-wide">Quiz Editor</h2>
              </div>
            </div>
            <AdminQuizPage embedded />
          </div>
        </div>
      </div>
    </main>
  );
}
