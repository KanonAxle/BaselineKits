// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { lookupAddress, register, saveToken } from '../../lib/api';
import Navbar from '../components/Navbar';

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
  const [billingSuggestions, setBillingSuggestions] = useState([]);
  const [mailingSuggestions, setMailingSuggestions] = useState([]);
  const [billingStatus, setBillingStatus] = useState('idle');
  const [mailingStatus, setMailingStatus] = useState('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  function updateAddressField(addressKey, field, value) {
    const setter = addressKey === 'billing' ? setBillingAddress : setMailingAddress;
    setter((current) => ({ ...current, [field]: value }));
  }

  function applySuggestion(addressKey, suggestion) {
    const segments = String(suggestion).split(',').map(part => part.trim()).filter(Boolean);
    const nextAddress = { ...emptyAddress() };
    if (segments[0]) nextAddress.street = segments[0];
    if (segments[1]) nextAddress.city = segments[1].replace(/\s+[A-Z]{2}\s+\d{5}.*$/i, '').trim();
    if (segments[2]) {
      const trailing = segments[2].trim();
      const stateMatch = trailing.match(/^([A-Za-z]{2})\b/);
      const zipMatch = trailing.match(/(\d{5})(?:-\d{4})?$/);
      nextAddress.state = stateMatch ? stateMatch[1].toUpperCase() : trailing.split(' ')[0] || '';
      nextAddress.zip = zipMatch ? zipMatch[1] : (trailing.split(' ').slice(1).join(' ') || '');
    }
    if (addressKey === 'billing') setBillingAddress(nextAddress);
    else setMailingAddress(nextAddress);
  }

  useEffect(() => {
    if (sameAsBilling) {
      setMailingAddress({ ...billingAddress });
    }
  }, [sameAsBilling, billingAddress]);

  useEffect(() => {
    const validateAddress = async (addressKey, address, setStatus, setSuggestions) => {
      const hasStreet = String(address.street || '').trim().length >= 3;
      const hasCity = String(address.city || '').trim().length >= 2;
      const hasState = String(address.state || '').trim().length >= 2;
      const hasZip = String(address.zip || '').trim().length >= 3;
      if (!hasStreet || !hasCity || !hasState || !hasZip) {
        setStatus('incomplete');
        setSuggestions([]);
        return;
      }

      try {
        setStatus('checking');
        const data = await lookupAddress({
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
        });
        const suggestions = (data?.suggestions || []).map((item) => [
          item.street,
          item.street2,
          `${item.city}, ${item.state} ${item.zip}${item.zip_plus_four ? `-${item.zip_plus_four}` : ''}`
        ].filter(Boolean).join(', '));

        setSuggestions(suggestions);
        setStatus(suggestions.length ? 'success' : 'empty');
      } catch {
        setSuggestions([]);
        setStatus('fallback');
      }
    };

    validateAddress('billing', billingAddress, setBillingStatus, setBillingSuggestions);
    validateAddress('mailing', mailingAddress, setMailingStatus, setMailingSuggestions);
  }, [billingAddress, mailingAddress]);

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
      const data = await register(
        email.trim(),
        password,
        name.trim(),
        phoneNumber.trim(),
        { ...billingAddress, street2: billingAddress.street2 || '' },
        { ...mailingAddress, street2: mailingAddress.street2 || '' }
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
                  <input value={billingAddress.street} onChange={e => updateAddressField('billing', 'street', e.target.value)} placeholder="Street address" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                  <input value={billingAddress.street2} onChange={e => updateAddressField('billing', 'street2', e.target.value)} placeholder="Apt / Suite / Unit (optional)" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                  <div className="grid md:grid-cols-3 gap-3">
                    <input value={billingAddress.city} onChange={e => updateAddressField('billing', 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    <input value={billingAddress.state} onChange={e => updateAddressField('billing', 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    <input value={billingAddress.zip} onChange={e => updateAddressField('billing', 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                  </div>
                  {billingStatus !== 'idle' && billingStatus !== 'incomplete' && (
                    <div className="text-xs text-stone-300">
                      {billingStatus === 'checking' ? 'Validating billing address with Smarty…' : billingStatus === 'success' ? 'Smarty validated the billing address.' : billingStatus === 'empty' ? 'Smarty found no match for this billing address.' : 'Smarty validation unavailable for this billing address.'}
                    </div>
                  )}
                  {billingSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {billingSuggestions.slice(0, 3).map((item, index) => (
                        <button key={`${item}-${index}`} type="button" onClick={() => applySuggestion('billing', item)} className="text-xs border border-stone-700 bg-stone-800 hover:border-orange-500 text-stone-300 px-2 py-1 rounded">
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-stone-800 rounded-xl p-4 bg-stone-950/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Mailing Address</h2>
                  <label className="flex items-center gap-2 text-sm text-stone-300">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={e => setSameAsBilling(e.target.checked)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    Same as billing
                  </label>
                </div>

                {!sameAsBilling && (
                  <div className="grid gap-3">
                    <input value={mailingAddress.street} onChange={e => updateAddressField('mailing', 'street', e.target.value)} placeholder="Street address" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    <input value={mailingAddress.street2} onChange={e => updateAddressField('mailing', 'street2', e.target.value)} placeholder="Apt / Suite / Unit (optional)" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    <div className="grid md:grid-cols-3 gap-3">
                      <input value={mailingAddress.city} onChange={e => updateAddressField('mailing', 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                      <input value={mailingAddress.state} onChange={e => updateAddressField('mailing', 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                      <input value={mailingAddress.zip} onChange={e => updateAddressField('mailing', 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500" />
                    </div>
                    {mailingStatus !== 'idle' && mailingStatus !== 'incomplete' && (
                      <div className="text-xs text-stone-300">
                        {mailingStatus === 'checking' ? 'Validating mailing address with Smarty…' : mailingStatus === 'success' ? 'Smarty validated the mailing address.' : mailingStatus === 'empty' ? 'Smarty found no match for this mailing address.' : 'Smarty validation unavailable for this mailing address.'}
                      </div>
                    )}
                    {mailingSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {mailingSuggestions.slice(0, 3).map((item, index) => (
                          <button key={`${item}-${index}`} type="button" onClick={() => applySuggestion('mailing', item)} className="text-xs border border-stone-700 bg-stone-800 hover:border-orange-500 text-stone-300 px-2 py-1 rounded">
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
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
