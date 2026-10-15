'use client';
import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getOrders, getToken, lookupAddress, removeToken, updateProfile } from '../../lib/api';
import Navbar from '../components/Navbar';

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const statusColors: Record<string, string> = {
  placed: 'text-yellow-400',
  paid: 'text-blue-400',
  packed: 'text-purple-400',
  shipped: 'text-orange-400',
  delivered: 'text-green-400'
};

const statusLabels: Record<string, string> = {
  placed: 'Order Received',
  paid: 'Payment Confirmed',
  packed: 'Being Packed',
  shipped: 'Shipped',
  delivered: 'Delivered'
};

type AddressFields = {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
};

const emptyAddress = (): AddressFields => ({ street: '', street2: '', city: '', state: '', zip: '' });

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState<AddressFields>(emptyAddress());
  const [mailingAddress, setMailingAddress] = useState<AddressFields>(emptyAddress());
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [billingSuggestions, setBillingSuggestions] = useState<string[]>([]);
  const [mailingSuggestions, setMailingSuggestions] = useState<string[]>([]);
  const [billingStatus, setBillingStatus] = useState('idle');
  const [mailingStatus, setMailingStatus] = useState('idle');

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        const [userData, ordersData] = await Promise.all([getMe(), getOrders()]);
        setUser(userData);
        setName(userData.name || '');
        setPhoneNumber(userData.phone_number || '');
        setBillingAddress({
          street: userData.billing_address?.street || '',
          street2: userData.billing_address?.street2 || '',
          city: userData.billing_address?.city || '',
          state: userData.billing_address?.state || '',
          zip: userData.billing_address?.zip || '',
        });
        setMailingAddress({
          street: userData.mailing_address?.street || '',
          street2: userData.mailing_address?.street2 || '',
          city: userData.mailing_address?.city || '',
          state: userData.mailing_address?.state || '',
          zip: userData.mailing_address?.zip || '',
        });
        setOrders(ordersData);
      } catch {
        removeToken();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  useEffect(() => {
    if (sameAsBilling) {
      setMailingAddress({ ...billingAddress });
    }
  }, [sameAsBilling, billingAddress]);

  useEffect(() => {
    const validateAddress = async (
      _addressKey: string,
      address: AddressFields,
      setStatus: (value: string) => void,
      setSuggestions: (value: string[]) => void,
    ) => {
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
        const suggestions = (data?.suggestions || []).map((item: any) => [
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

  function updateAddressField(
    setter: Dispatch<SetStateAction<AddressFields>>,
    field: keyof AddressFields,
    value: string,
  ) {
    setter((current) => ({ ...current, [field]: value }));
  }

  function applySuggestion(setter: Dispatch<SetStateAction<AddressFields>>, suggestion: string) {
    const segments = String(suggestion).split(',').map(part => part.trim()).filter(Boolean);
    const nextAddress = emptyAddress();
    if (segments[0]) nextAddress.street = segments[0];
    if (segments[1]) nextAddress.city = segments[1].replace(/\s+[A-Z]{2}\s+\d{5}.*$/i, '').trim();
    if (segments[2]) {
      const trailing = segments[2].trim();
      const stateMatch = trailing.match(/^([A-Za-z]{2})\b/);
      const zipMatch = trailing.match(/(\d{5})(?:-\d{4})?$/);
      nextAddress.state = stateMatch ? stateMatch[1].toUpperCase() : trailing.split(' ')[0] || '';
      nextAddress.zip = zipMatch ? zipMatch[1] : (trailing.split(' ').slice(1).join(' ') || '');
    }
    setter(nextAddress);
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateProfile({
        name,
        phone_number: phoneNumber,
        billing_address: billingAddress,
        mailing_address: mailingAddress,
      });
      const refreshedUser = await getMe();
      setUser(refreshedUser);
      setName(refreshedUser.name || '');
      setPhoneNumber(refreshedUser.phone_number || '');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save your account information.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Loading your account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-8">
          <h1 className="text-2xl font-bold mb-1">{user?.name || 'Your Account'}</h1>
          <p className="text-stone-400 text-sm">{user?.email}</p>
        </div>

        <form onSubmit={saveProfile} className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Account Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-stone-400 mb-1 block">Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
              </div>
              <div>
                <label className="text-sm text-stone-400 mb-1 block">Phone</label>
                <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="border border-stone-800 rounded-xl p-4 bg-stone-950/50">
              <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
              <div className="grid gap-3">
                <input value={billingAddress.street} onChange={e => updateAddressField(setBillingAddress, 'street', e.target.value)} placeholder="Street address" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                <input value={billingAddress.street2} onChange={e => updateAddressField(setBillingAddress, 'street2', e.target.value)} placeholder="Apt / Suite / Unit" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                <div className="grid sm:grid-cols-3 gap-3">
                  <input value={billingAddress.city} onChange={e => updateAddressField(setBillingAddress, 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  <input value={billingAddress.state} onChange={e => updateAddressField(setBillingAddress, 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  <input value={billingAddress.zip} onChange={e => updateAddressField(setBillingAddress, 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                </div>
                {billingStatus !== 'idle' && billingStatus !== 'incomplete' && (
                  <div className="text-xs text-stone-300">
                    {billingStatus === 'checking' ? 'Validating billing address with Smarty…' : billingStatus === 'success' ? 'Smarty validated your billing address.' : billingStatus === 'empty' ? 'Smarty found no match for this billing address.' : 'Smarty validation is unavailable for this billing address.'}
                  </div>
                )}
                {billingSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {billingSuggestions.slice(0, 3).map((item, index) => (
                      <button key={item + index} type="button" onClick={() => applySuggestion(setBillingAddress, item)} className="text-xs border border-stone-700 px-2 py-1 rounded hover:border-orange-500">
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border border-stone-800 rounded-xl p-4 bg-stone-950/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Mailing Address</h3>
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
                  <input value={mailingAddress.street} onChange={e => updateAddressField(setMailingAddress, 'street', e.target.value)} placeholder="Street address" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  <input value={mailingAddress.street2} onChange={e => updateAddressField(setMailingAddress, 'street2', e.target.value)} placeholder="Apt / Suite / Unit" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input value={mailingAddress.city} onChange={e => updateAddressField(setMailingAddress, 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                    <input value={mailingAddress.state} onChange={e => updateAddressField(setMailingAddress, 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                    <input value={mailingAddress.zip} onChange={e => updateAddressField(setMailingAddress, 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  </div>
                  {mailingStatus !== 'idle' && mailingStatus !== 'incomplete' && (
                    <div className="text-xs text-stone-300">
                      {mailingStatus === 'checking' ? 'Validating mailing address with Smarty…' : mailingStatus === 'success' ? 'Smarty validated your mailing address.' : mailingStatus === 'empty' ? 'Smarty found no match for this mailing address.' : 'Smarty validation is unavailable for this mailing address.'}
                    </div>
                  )}
                  {mailingSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {mailingSuggestions.slice(0, 3).map((item, index) => (
                        <button key={item + index} type="button" onClick={() => applySuggestion(setMailingAddress, item)} className="text-xs border border-stone-700 px-2 py-1 rounded hover:border-orange-500">
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
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            {saving ? 'Saving account...' : 'Save Account Info'}
          </button>
        </form>

        <h2 className="text-xl font-bold mb-4">Order History</h2>
        {orders.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 text-center">
            <p className="text-stone-400 mb-4">You haven't placed any orders yet.</p>
            <Link href="/quiz" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Build My First Kit →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{order.kit_name}</p>
                    <p className="text-stone-500 text-xs mt-1">
                      Placed {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${statusColors[order.status] || 'text-stone-400'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 text-sm">Total: <span className="text-white font-semibold">{formatPrice(order.total_cents)}</span></span>
                  <p className="text-stone-600 text-xs">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/quiz" className="text-orange-500 hover:text-orange-400 text-sm">
            + Build Another Kit
          </Link>
        </div>
      </div>
    </main>
  );
}
