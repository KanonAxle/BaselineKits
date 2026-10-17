// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import GoogleAddressAutocomplete from '../components/GoogleAddressAutocomplete';
import { useCart } from '../../lib/cartContext';
import { createCartOrder, createCheckout, getKit, getMe, getToken } from '../../lib/api';
import { calculateShippingCents } from '../../lib/shippingPricing';

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function collectSizable(items: any[]): any[] {
  const result: any[] = [];
  for (const item of items) {
    if (item.type === 'product' && item.requires_sizing) result.push(item);
    else if (item.type === 'kit' && Array.isArray(item.items)) result.push(...collectSizable(item.items));
  }
  return result;
}

type KitSizingCheck = 'checking' | 'required' | 'not-required' | 'error';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, totalCents } = useCart();
  const shippingCents = calculateShippingCents(totalCents);
  const checkoutTotalCents = totalCents + shippingCents;
  const [address, setAddress] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [savedAddress, setSavedAddress] = useState<{ street: string; street2: string; city: string; state: string; zip: string } | null>(null);
  const [useAccountAddress, setUseAccountAddress] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState('');
  const [kitSizingChecks, setKitSizingChecks] = useState<Record<string, KitSizingCheck>>({});
  const [kitSizingRefresh, setKitSizingRefresh] = useState(0);

  function variantSummary(item: any) {
    const parts: string[] = [];
    if (item.selectedColor) parts.push(item.selectedColor);
    if (item.selectedSize) parts.push(item.selectedSize);
    return parts.join(' · ');
  }

  useEffect(() => {
    if (!getToken()) {
      setAccountLoading(false);
      return;
    }
    getMe()
      .then(user => {
        setIsAuthenticated(true);
        setEmail(user.email || '');
        setPhone(user.phone_number || '');
        const mailingAddress = user.mailing_address || {};
        const nextAddress = {
          street: mailingAddress.street || '',
          street2: mailingAddress.street2 || '',
          city: mailingAddress.city || '',
          state: mailingAddress.state || '',
          zip: mailingAddress.zip || '',
        };
        const hasUsableAddress = Boolean(
          nextAddress.street.trim() &&
          nextAddress.city.trim() &&
          nextAddress.state.trim() &&
          nextAddress.zip.trim()
        );
        setSavedAddress(hasUsableAddress ? nextAddress : null);
        setUseAccountAddress(hasUsableAddress);
        if (hasUsableAddress) {
          setAddress(nextAddress.street);
          setAddress2(nextAddress.street2);
          setCity(nextAddress.city);
          setState(nextAddress.state);
          setZip(nextAddress.zip);
        }
      })
      .catch(() => {
        setAccountError('We could not verify your account. Please log in again before checkout.');
      })
      .finally(() => setAccountLoading(false));
  }, [router]);

  useEffect(() => {
    let active = true;
    const kits = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.type === 'kit');

    Promise.all(kits.map(async ({ item }) => {
      try {
        const kitData = await getKit(item.id);
        if (active) {
          setKitSizingChecks(current => ({
            ...current,
            [item.id]: collectSizable(kitData.items || []).length > 0 ? 'required' : 'not-required',
          }));
        }
      } catch {
        if (active) {
          setKitSizingChecks(current => ({ ...current, [item.id]: 'error' }));
        }
      }
    }));

    return () => { active = false; };
  }, [items, kitSizingRefresh]);

  function buildShippingAddress() {
    return [address, address2, city, state, zip].filter(Boolean).join(', ');
  }

  async function handleCheckout() {
    setError('');
    if (!getToken() || !isAuthenticated) {
      router.push('/register?next=%2Fcart');
      return;
    }
    const shippingAddress = buildShippingAddress();
    if (!address.trim()) { setError('Please enter your shipping address.'); return; }
    if (!city.trim()) { setError('Please enter your city.'); return; }
    if (!state.trim()) { setError('Please enter your state.'); return; }
    if (!/^\d{5}(?:-\d{4})?$/.test(zip.trim())) { setError('Please enter a valid U.S. ZIP code.'); return; }
    if (!termsAccepted) { setError('Please accept the Terms of Use to continue.'); return; }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type !== 'kit') continue;
      if (kitSizingChecks[item.id] === 'checking' || !kitSizingChecks[item.id]) {
        setError('Please wait while we check whether your kits need sizing.');
        return;
      }
      if (kitSizingChecks[item.id] === 'error') {
        setError('We could not check sizing requirements for a kit. Please retry the check before checkout.');
        return;
      }
      if (kitSizingChecks[item.id] === 'required' && !item.sizingComplete) {
        router.push(`/sizing?kitIndex=${i}`);
        return;
      }
    }

    setLoading(true);
    try {
      const order = await createCartOrder(items, shippingAddress, 'US', phone || null, termsAccepted, marketingOptIn);
      const checkout = await createCheckout(
        order.order_id,
        `${window.location.origin}/success?order_id=${order.order_id}`,
        `${window.location.origin}/cancel`
      );
      clearCart();
      window.location.href = checkout.url;
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-stone-950 text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-5xl mb-6 text-stone-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-stone-400 mb-8">Add products or a kit recommendation to get started.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/kits" className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded transition-colors">
              Browse Kits →
            </Link>
            <Link href="/quiz" className="border border-stone-700 hover:border-orange-500 text-stone-400 hover:text-orange-400 font-bold text-xs uppercase tracking-widest px-8 py-4 rounded transition-colors">
              Build a Kit →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="mb-2 text-orange-500 text-sm font-semibold uppercase tracking-widest">Your Cart</div>
        <h1 className="text-3xl font-bold mb-8">Review Order</h1>

        {/* Item list */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6 flex flex-col gap-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-stone-800 pb-4 last:border-b-0 last:pb-0">

              {/* Thumbnail */}
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-14 h-14 object-contain rounded bg-white shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-stone-800 rounded flex items-center justify-center text-2xl shrink-0">
                  {item.type === 'kit' ? '🎒' : '📦'}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{item.name}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {item.type === 'kit' && (
                    <span className="text-xs px-1.5 py-0.5 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400">Kit</span>
                  )}
                  {variantSummary(item) && (
                    <span className="text-stone-400 text-xs">{variantSummary(item)}</span>
                  )}
                  {item.type === 'kit' && kitSizingChecks[item.id] === 'required' && !item.sizingComplete && (
                    <button
                      type="button"
                      onClick={() => router.push(`/sizing?kitIndex=${index}`)}
                      className="text-xs px-2 py-0.5 rounded border border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      Sizing needed →
                    </button>
                  )}
                  {item.type === 'kit' && kitSizingChecks[item.id] === 'required' && item.sizingComplete && (
                    <button
                      type="button"
                      onClick={() => router.push(`/sizing?kitIndex=${index}`)}
                      className="text-xs px-2 py-0.5 rounded border border-stone-700 text-stone-500 hover:border-stone-500 transition-colors"
                    >
                      Edit sizing
                    </button>
                  )}
                  {item.type === 'kit' && kitSizingChecks[item.id] === 'error' && (
                    <span className="text-xs text-amber-400">
                      Could not check sizing.{' '}
                      <button type="button" onClick={() => setKitSizingRefresh(current => current + 1)} className="underline hover:text-amber-300">
                        Retry
                      </button>
                    </span>
                  )}
                </div>
                <div className="text-stone-500 text-xs mt-1">{formatPrice(item.price_cents)} each</div>
              </div>

              {/* Quantity stepper */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  className="w-9 h-9 rounded border border-stone-700 hover:border-stone-500 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
                >
                  −
                </button>
                <span className="w-5 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  className="w-9 h-9 rounded border border-stone-700 hover:border-stone-500 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
                >
                  +
                </button>
              </div>

              {/* Line price */}
              <div className="text-right shrink-0 w-20">
                <div className="font-bold">{formatPrice(item.price_cents * item.quantity)}</div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(index)}
                className="text-stone-600 hover:text-red-400 transition-colors text-xl shrink-0 leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Shipping & Contact */}
        {isAuthenticated ? (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Shipping & Contact</h2>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-stone-400">
              U.S. shipping only. Shipping is $14.95 on orders under $300 and free on orders of $300 or more.
              Once Stripe Tax is configured, Stripe Checkout will ask you to confirm your shipping address and show any applicable sales tax before payment.
            </p>
            <label className="flex items-center gap-3 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={useAccountAddress}
                disabled={!savedAddress}
                onChange={event => {
                  const checked = event.target.checked;
                  setUseAccountAddress(checked);
                  if (checked && savedAddress) {
                    setAddress(savedAddress.street);
                    setAddress2(savedAddress.street2);
                    setCity(savedAddress.city);
                    setState(savedAddress.state);
                    setZip(savedAddress.zip);
                  }
                }}
                className="h-4 w-4 accent-orange-500 disabled:opacity-50"
              />
              <span>Use my saved mailing address{accountLoading ? ' (loading…)': ''}</span>
            </label>
            {!accountLoading && !savedAddress && (
              <p className="text-xs text-stone-500">No complete mailing address is saved to your account yet. Enter a shipping address below.</p>
            )}
            {useAccountAddress && savedAddress ? (
              <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-3 text-sm text-stone-300">
                <p>{[savedAddress.street, savedAddress.street2, savedAddress.city, savedAddress.state, savedAddress.zip].filter(Boolean).join(', ')}</p>
                <Link href="/account" className="mt-2 inline-block text-xs text-orange-400 underline">Edit saved address</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <GoogleAddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onAddressSelected={selected => {
                    setAddress(selected.street);
                    setAddress2(selected.street2 || '');
                    setCity(selected.city);
                    setState(selected.state);
                    setZip(selected.zip);
                  }}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  value={address2}
                  onChange={e => setAddress2(e.target.value)}
                  placeholder="Apartment, suite, unit, etc."
                  autoComplete="address-line2"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500 md:col-span-2"
                />
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City"
                  autoComplete="address-level2"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="State"
                  autoComplete="address-level1"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  value={zip}
                  onChange={e => setZip(e.target.value)}
                  placeholder="ZIP code"
                  autoComplete="postal-code"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500 md:col-span-2"
                />
              </div>
            )}
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-3 text-sm text-stone-400">
              <span className="text-stone-500">Account email for order updates: </span>
              <span className="text-white">{accountLoading ? 'Loading account…' : email}</span>
              {' '}<Link href="/account" className="text-orange-400 underline">Manage account</Link>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number (recommended — for shipping updates)"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
            />
            <label className="flex items-start gap-3 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                required
                className="mt-1 h-4 w-4 accent-orange-500"
              />
              <span>
                I agree to the <Link href="/terms" target="_blank" className="text-orange-400 underline">Terms of Use</Link> and acknowledge the <Link href="/privacy" target="_blank" className="text-orange-400 underline">Privacy Policy</Link>. Required to place an order.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-stone-400">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={e => setMarketingOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 accent-orange-500"
              />
              <span>Yes, I consent to receive product news and offers by email. Optional and not required to place an order.</span>
            </label>
          </div>
        </div>
        ) : accountLoading ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
            <p className="text-sm text-stone-400">Checking your account before showing checkout details…</p>
          </div>
        ) : (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
            <h2 className="font-semibold mb-2">Account required for checkout</h2>
            <p className="text-sm text-stone-400">
              You can review and update your cart without an account. Create an account or log in when you are ready to continue to checkout.
            </p>
            {accountError && <p className="text-amber-400 text-sm mt-3">{accountError}</p>}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Total + Checkout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-stone-900 border border-stone-800 rounded-xl px-6 py-5">
          <div>
            <div className="flex justify-between gap-6 text-sm text-stone-400">
              <span>Items</span><span>{formatPrice(totalCents)}</span>
            </div>
            <div className="flex justify-between gap-6 text-sm text-stone-400 mt-1">
              <span>Shipping</span><span>{shippingCents ? formatPrice(shippingCents) : 'Free'}</span>
            </div>
            <div className="text-stone-400 text-sm mt-2">Total</div>
            <div className="text-3xl font-bold">{formatPrice(checkoutTotalCents)}</div>
          </div>
          {accountLoading ? (
            <p className="text-sm text-stone-400">Checking account…</p>
          ) : isAuthenticated ? (
            <button
              onClick={handleCheckout}
              disabled={loading || accountLoading}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-center"
            >
              {loading ? 'Processing...' : 'Checkout →'}
            </button>
          ) : (
            <div className="flex flex-col gap-3 sm:min-w-56">
              <Link
                href="/register?next=%2Fcart"
                className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-center"
              >
                Create Account to Checkout
              </Link>
              <Link
                href="/login?next=%2Fcart"
                className="text-center text-sm text-stone-300 hover:text-white underline underline-offset-4"
              >
                Already have an account? Log in
              </Link>
            </div>
          )}
        </div>
        {isAuthenticated && (
          <p className="text-stone-600 text-xs text-center mt-4">You'll be redirected to Stripe for secure payment.</p>
        )}
      </div>
    </main>
  );
}
