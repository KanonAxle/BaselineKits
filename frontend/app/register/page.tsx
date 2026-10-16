// @ts-nocheck
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, saveToken } from '../../lib/api';
import Navbar from '../components/Navbar';
import GoogleAddressAutocomplete from '../components/GoogleAddressAutocomplete';

const emptyAddress = () => ({ street: '', street2: '', city: '', state: '', zip: '' });

function getNextPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('next');
  return requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/account';
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState(emptyAddress());
  const [mailingAddress, setMailingAddress] = useState(emptyAddress());
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  function updateAddressField(addressKey, field, value) {
    const setter = addressKey === 'billing' ? setBillingAddress : setMailingAddress;
    setter((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Full name, email, and password are required.');
      setLoading(false);
      return;
    }

    try {
      const addressForMailing = sameAsBilling ? billingAddress : mailingAddress;
      const data = await register(
        email.trim(),
        password,
        name.trim(),
        phoneNumber.trim(),
        { ...billingAddress, street2: billingAddress.street2 || '' },
        { ...addressForMailing, street2: addressForMailing.street2 || '' }
      );
      saveToken(data.token);
      router.push(getNextPath());
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 mb-4">
            <h1 className="text-2xl font-bold mb-2">Create Account</h1>
            <p className="text-stone-400 text-sm mb-8">Your account keeps your information safe and secure. Your information is used to provide notifications for sizing changes and expiration dates on certain products.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-stone-400 mb-1 block">Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                    placeholder="John Smith" />
                </div>
                <div>
                  <label className="text-sm text-stone-400 mb-1 block">Phone</label>
                  <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                    placeholder="(208) 555-1234" />
                </div>
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

              <div className="border border-stone-800 rounded-xl p-4 bg-stone-950/50">
                <h2 className="text-lg font-semibold mb-4">Billing Address</h2>
                <div className="grid gap-3">
                  <GoogleAddressAutocomplete
                    value={billingAddress.street}
                    onChange={street => updateAddressField('billing', 'street', street)}
                    onAddressSelected={selected => setBillingAddress(current => ({
                      ...current,
                      street: selected.street,
                      street2: selected.street2 || '',
                      city: selected.city,
                      state: selected.state,
                      zip: selected.zip,
                    }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                  />
                  <input value={billingAddress.street2} onChange={e => updateAddressField('billing', 'street2', e.target.value)} placeholder="Apt / Suite / Unit (optional)" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                  <div className="grid md:grid-cols-3 gap-3">
                    <input value={billingAddress.city} onChange={e => updateAddressField('billing', 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    <input value={billingAddress.state} onChange={e => updateAddressField('billing', 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    <input value={billingAddress.zip} onChange={e => updateAddressField('billing', 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
              </div>

              <div className="border border-stone-800 rounded-xl p-4 bg-stone-950/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Mailing Address</h2>
                  <label className="flex items-center gap-2 text-sm text-stone-300">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={e => {
                        if (sameAsBilling && !e.target.checked) {
                          setMailingAddress({ ...billingAddress });
                        }
                        setSameAsBilling(e.target.checked);
                      }}
                      className="h-4 w-4 accent-orange-500"
                    />
                    Same as billing
                  </label>
                </div>

                {!sameAsBilling && (
                  <div className="grid gap-3">
                    <GoogleAddressAutocomplete
                      value={mailingAddress.street}
                      onChange={street => updateAddressField('mailing', 'street', street)}
                      onAddressSelected={selected => setMailingAddress(current => ({
                        ...current,
                        street: selected.street,
                        street2: selected.street2 || '',
                        city: selected.city,
                        state: selected.state,
                        zip: selected.zip,
                      }))}
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                    />
                    <input value={mailingAddress.street2} onChange={e => updateAddressField('mailing', 'street2', e.target.value)} placeholder="Apt / Suite / Unit (optional)" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    <div className="grid md:grid-cols-3 gap-3">
                      <input value={mailingAddress.city} onChange={e => updateAddressField('mailing', 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                      <input value={mailingAddress.state} onChange={e => updateAddressField('mailing', 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                      <input value={mailingAddress.zip} onChange={e => updateAddressField('mailing', 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                )}
                {sameAsBilling && (
                  <p className="text-sm text-stone-400">Using the same address as billing.</p>
                )}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={loading}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors mt-2">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-stone-500 text-sm text-center mt-6">
              Already have an account?{' '}
              <Link
                href="/login"
                onClick={event => {
                  event.preventDefault();
                  router.push(`/login?next=${encodeURIComponent(getNextPath())}`);
                }}
                className="text-orange-500 hover:text-orange-400"
              >Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
