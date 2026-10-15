// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminToken, getKits, adminCreatePhoneOrder, lookupAddress } from '../../../../lib/api';

const emptyForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  kit_id: '',
  shipping_address: '',
  notes: '',
};

export default function NewPhoneOrderPage() {
  const router = useRouter();
  const [kits, setKits] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null); // { order_id, payment_url, total_cents, expires_at }
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) { router.push('/admin'); return; }
    getKits().then(setKits).catch(() => {});
  }, [router]);

  function normalizeAddressText(value) {
    return value ? value.replace(/\s+/g, ' ').trim() : '';
  }

  function buildAddressSuggestionsFromText(value) {
    const text = normalizeAddressText(value);
    if (!text) return [];

    const lineParts = text.split(/[\n,]+/).map(part => part.trim()).filter(Boolean);
    if (!lineParts.length) return [];

    const street = lineParts[0];
    const zipMatch = text.match(/(\d{5})(?:-\d{4})?$/);
    const stateMatch = text.match(/\b([A-Z]{2})\b/);
    const cityMatch = lineParts.length > 1 ? lineParts[lineParts.length - 2] : '';

    const candidates = [
      text,
      street && cityMatch && stateMatch ? `${street}, ${cityMatch}, ${stateMatch[1]} ${zipMatch ? zipMatch[1] : ''}`.trim() : null,
      street && stateMatch && zipMatch ? `${street}, ${stateMatch[1]} ${zipMatch[1]}` : null,
    ].filter(Boolean);

    return [...new Set(candidates)].slice(0, 3);
  }

  useEffect(() => {
    const fallbackSuggestions = buildAddressSuggestionsFromText(form.shipping_address);
    const text = normalizeAddressText(form.shipping_address);
    if (!text) {
      setAddressSuggestions([]);
      return;
    }

    const parts = text.split(/[\n,]+/).map(part => part.trim()).filter(Boolean);
    const street = parts[0] || '';
    const zipMatch = text.match(/(\d{5})(?:-\d{4})?$/);
    const stateMatch = text.match(/\b([A-Z]{2})\b/);
    const cityMatch = parts.length > 1 ? parts[parts.length - 2] : '';

    if (!street || !cityMatch || !stateMatch || !zipMatch) {
      setAddressSuggestions(fallbackSuggestions);
      return;
    }

    let active = true;
    const runLookup = async () => {
      setAddressLookupLoading(true);
      try {
        const data = await lookupAddress({ street, city: cityMatch, state: stateMatch[1], zip: zipMatch[1] });
        const suggestions = (data?.suggestions || []).map((item) => {
          const parts = [item.street, item.street2, `${item.city}, ${item.state} ${item.zip}${item.zip_plus_four ? `-${item.zip_plus_four}` : ''}`].filter(Boolean);
          return parts.join(', ');
        });

        if (active) setAddressSuggestions(suggestions.length ? suggestions : fallbackSuggestions);
      } catch {
        if (active) setAddressSuggestions(fallbackSuggestions);
      } finally {
        if (active) setAddressLookupLoading(false);
      }
    };

    runLookup();
    return () => { active = false; };
  }, [form.shipping_address]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function applyAddressSuggestion(suggestion) {
    set('shipping_address', suggestion);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.customer_name.trim()) { setFormError('Customer name is required.'); return; }
    if (!form.customer_email.trim()) { setFormError('Customer email is required.'); return; }
    if (!form.kit_id) { setFormError('Select a kit.'); return; }
    if (!form.shipping_address.trim()) { setFormError('Shipping address is required.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const data = await adminCreatePhoneOrder({
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim() || null,
        kit_id: form.kit_id,
        shipping_address: form.shipping_address.trim(),
        notes: form.notes.trim() || null,
      });
      setResult(data);
    } catch (err) {
      setFormError(err.message || 'Failed to create order. Check that Stripe is configured.');
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(result.payment_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function createAnother() {
    setResult(null);
    setForm(emptyForm);
    setCopied(false);
    setFormError('');
  }

  // ---- Success state ----
  if (result) {
    const expiresLocal = new Date(result.expires_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
      <main className="min-h-screen bg-stone-950 text-white">
        <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">BaselineKits</Link>
            <span className="label-tactical text-stone-600">/ Orders / New Phone Order</span>
          </div>
          <Link href="/admin/orders" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">← All Orders</Link>
        </nav>

        <div className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-green-400 text-2xl">✓</span>
          </div>
          <p className="label-tactical text-green-400 mb-2 tracking-[0.2em]">// Order Created</p>
          <h1 className="text-2xl font-extrabold uppercase tracking-wide mb-2">Payment Link Ready</h1>
          <p className="text-stone-400 text-sm mb-8">
            Send this link to <span className="text-white">{form.customer_name}</span> at <span className="text-white">{form.customer_email}</span>.
            It expires <span className="text-white">{expiresLocal}</span>.
          </p>

          {/* Payment link */}
          <div className="bg-stone-900 border border-stone-700 rounded p-4 mb-4 text-left">
            <p className="label-tactical text-stone-500 mb-2" style={{ fontSize: '0.6rem' }}>PAYMENT LINK</p>
            <p className="text-orange-400 text-xs break-all leading-relaxed mb-3">{result.payment_url}</p>
            <button
              onClick={copyLink}
              className={`w-full py-3 rounded text-xs font-bold uppercase tracking-widest border transition-all ${copied ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-orange-500 bg-orange-600 text-white hover:bg-orange-500'}`}
            >
              {copied ? '✓ Copied to Clipboard' : 'Copy Payment Link'}
            </button>
          </div>

          <p className="text-stone-500 text-xs mb-8">
            Total: <span className="text-white font-bold">${(result.total_cents / 100).toFixed(2)}</span>
            {' · '}Order ID: <span className="text-stone-400 font-mono">{result.order_id.slice(0, 8)}…</span>
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={copyLink}
              className="border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded transition-colors"
            >
              Copy Link Again
            </button>
            <button
              onClick={createAnother}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
            >
              + Create Another Order
            </button>
            <Link
              href="/admin/orders"
              className="text-stone-500 hover:text-white text-xs uppercase tracking-widest transition-colors py-2"
            >
              View All Orders →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---- Form state ----
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">BaselineKits</Link>
          <span className="label-tactical text-stone-600">/ Orders / New Phone Order</span>
        </div>
        <Link href="/admin/orders" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">← All Orders</Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Phone Order</p>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide">New Phone Order</h1>
          <p className="text-stone-400 text-sm mt-2">Fill in the customer's details and select a kit. A Stripe payment link will be generated for you to share with the customer.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Customer section */}
          <div className="bg-stone-900/80 border border-stone-800 rounded p-5">
            <p className="label-tactical text-orange-500/70 mb-4" style={{ fontSize: '0.65rem' }}>// CUSTOMER INFO</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label-tactical text-stone-500 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                  required
                  autoFocus
                  placeholder="Jane Smith"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="label-tactical text-stone-500 mb-1 block">Email Address *</label>
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={e => set('customer_email', e.target.value)}
                  required
                  placeholder="jane@example.com"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="label-tactical text-stone-500 mb-1 block">Phone Number <span className="text-stone-600 normal-case font-normal">(optional)</span></label>
                <input
                  type="tel"
                  value={form.customer_phone}
                  onChange={e => set('customer_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Kit selection */}
          <div className="bg-stone-900/80 border border-stone-800 rounded p-5">
            <p className="label-tactical text-orange-500/70 mb-4" style={{ fontSize: '0.65rem' }}>// KIT SELECTION</p>
            <div>
              <label className="label-tactical text-stone-500 mb-1 block">Kit *</label>
              {kits.length === 0 ? (
                <p className="text-stone-500 text-sm">No kits found. <Link href="/admin/kits" className="text-orange-500 hover:text-orange-400">Create a kit first.</Link></p>
              ) : (
                <select
                  value={form.kit_id}
                  onChange={e => set('kit_id', e.target.value)}
                  required
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">— Select a kit —</option>
                  {kits.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-stone-900/80 border border-stone-800 rounded p-5">
            <p className="label-tactical text-orange-500/70 mb-4" style={{ fontSize: '0.65rem' }}>// SHIPPING</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label-tactical text-stone-500 mb-1 block">Shipping Address *</label>
                <textarea
                  value={form.shipping_address}
                  onChange={e => set('shipping_address', e.target.value)}
                  required
                  rows={3}
                  placeholder={"123 Main St\nSpringfield, IL 62701"}
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 resize-none"
                />
                {addressSuggestions.length > 0 && (
                  <div className="mt-3 rounded border border-orange-500/30 bg-stone-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-400 mb-2">Suggested addresses</p>
                    <div className="flex flex-col gap-2">
                      {addressLookupLoading ? (
                        <p className="text-xs text-stone-400">Checking address…</p>
                      ) : (
                        addressSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => applyAddressSuggestion(suggestion)}
                            className="text-left rounded border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 hover:border-orange-500 hover:text-white transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="label-tactical text-stone-500 mb-1 block">Notes <span className="text-stone-600 normal-case font-normal">(optional — internal only)</span></label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="e.g. Customer requested blue bag"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || kits.length === 0}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest py-4 rounded transition-colors"
            >
              {saving ? 'Creating Order...' : 'Create Order + Generate Payment Link'}
            </button>
            <Link
              href="/admin/orders"
              className="border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white text-xs uppercase tracking-widest font-semibold px-6 py-4 rounded transition-colors flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
