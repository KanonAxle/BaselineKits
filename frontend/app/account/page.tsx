'use client';
import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getOrders, getToken, removeToken, updateProfile } from '../../lib/api';
import Navbar from '../components/Navbar';
import GoogleAddressAutocomplete from '../components/GoogleAddressAutocomplete';

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

type OrderHistoryItem = {
  product_id?: string;
  name: string;
  quantity: number;
  price_cents: number;
  selected_options?: {
    size?: string;
    color?: string;
    variants?: Array<{ option?: string }>;
  } | null;
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
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState<AddressFields>(emptyAddress());
  const [mailingAddress, setMailingAddress] = useState<AddressFields>(emptyAddress());
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(() => new Set());

  function toggleOrderExpanded(orderId: string) {
    setExpandedOrders(current => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

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
        setEmail(userData.email || '');
        setPhoneNumber(userData.phone_number || '');
        const nextBillingAddress = {
          street: userData.billing_address?.street || '',
          street2: userData.billing_address?.street2 || '',
          city: userData.billing_address?.city || '',
          state: userData.billing_address?.state || '',
          zip: userData.billing_address?.zip || '',
        };
        const nextMailingAddress = {
          street: userData.mailing_address?.street || '',
          street2: userData.mailing_address?.street2 || '',
          city: userData.mailing_address?.city || '',
          state: userData.mailing_address?.state || '',
          zip: userData.mailing_address?.zip || '',
        };
        setBillingAddress(nextBillingAddress);
        setMailingAddress(nextMailingAddress);
        setSameAsBilling(
          nextBillingAddress.street === nextMailingAddress.street &&
          nextBillingAddress.street2 === nextMailingAddress.street2 &&
          nextBillingAddress.city === nextMailingAddress.city &&
          nextBillingAddress.state === nextMailingAddress.state &&
          nextBillingAddress.zip === nextMailingAddress.zip
        );
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

  function updateAddressField(
    setter: Dispatch<SetStateAction<AddressFields>>,
    field: keyof AddressFields,
    value: string,
  ) {
    setter((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const emailChanged = email.trim().toLowerCase() !== String(user?.email || '').trim().toLowerCase();
    if (emailChanged && !currentPassword) {
      setError('Enter your current password to change your email.');
      setSaving(false);
      return;
    }

    try {
      const updatedProfile = await updateProfile({
        name,
        email: email.trim(),
        ...(emailChanged ? { current_password: currentPassword } : {}),
        phone_number: phoneNumber,
        billing_address: billingAddress,
        mailing_address: sameAsBilling ? billingAddress : mailingAddress,
      });
      if (updatedProfile.email_verification_required) {
        removeToken();
        router.push(`/verify-email?email=${encodeURIComponent(updatedProfile.email)}&next=%2Faccount&email_sent=${updatedProfile.email_sent ? 'true' : 'false'}`);
        return;
      }
      const refreshedUser = await getMe();
      setUser(refreshedUser);
      setName(refreshedUser.name || '');
      setEmail(refreshedUser.email || '');
      setCurrentPassword('');
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
                <label className="text-sm text-stone-400 mb-1 block">Email</label>
                <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                {email.trim().toLowerCase() !== String(user?.email || '').trim().toLowerCase() && (
                  <div className="mt-3">
                    <label className="text-sm text-stone-400 mb-1 block">Current password to confirm email change</label>
                    <input type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                    <p className="text-xs text-stone-500 mt-1">The new email takes effect immediately and will be used to sign in.</p>
                  </div>
                )}
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
                <GoogleAddressAutocomplete
                  value={billingAddress.street}
                  onChange={street => updateAddressField(setBillingAddress, 'street', street)}
                  onAddressSelected={selected => setBillingAddress(current => ({
                    ...current,
                    street: selected.street,
                    street2: selected.street2 || '',
                    city: selected.city,
                    state: selected.state,
                    zip: selected.zip,
                  }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white"
                />
                <input value={billingAddress.street2} onChange={e => updateAddressField(setBillingAddress, 'street2', e.target.value)} placeholder="Apt / Suite / Unit" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                <div className="grid sm:grid-cols-3 gap-3">
                  <input value={billingAddress.city} onChange={e => updateAddressField(setBillingAddress, 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  <input value={billingAddress.state} onChange={e => updateAddressField(setBillingAddress, 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  <input value={billingAddress.zip} onChange={e => updateAddressField(setBillingAddress, 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                </div>
              </div>
            </div>

            <div className="border border-stone-800 rounded-xl p-4 bg-stone-950/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Mailing Address</h3>
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
                    onChange={street => updateAddressField(setMailingAddress, 'street', street)}
                    onAddressSelected={selected => setMailingAddress(current => ({
                      ...current,
                      street: selected.street,
                      street2: selected.street2 || '',
                      city: selected.city,
                      state: selected.state,
                      zip: selected.zip,
                    }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white"
                  />
                  <input value={mailingAddress.street2} onChange={e => updateAddressField(setMailingAddress, 'street2', e.target.value)} placeholder="Apt / Suite / Unit" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input value={mailingAddress.city} onChange={e => updateAddressField(setMailingAddress, 'city', e.target.value)} placeholder="City" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                    <input value={mailingAddress.state} onChange={e => updateAddressField(setMailingAddress, 'state', e.target.value)} placeholder="State" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                    <input value={mailingAddress.zip} onChange={e => updateAddressField(setMailingAddress, 'zip', e.target.value)} placeholder="ZIP" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white" />
                  </div>
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
            {orders.map(order => {
              const expanded = expandedOrders.has(order.id);
              const customizations = order.customizations || {};
              const taxCents = customizations.stripe_tax_cents;
              const orderTotal = customizations.stripe_paid_total_cents ?? order.total_cents;
              const items: OrderHistoryItem[] = order.items || [];
              return (
                <section key={order.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleOrderExpanded(order.id)}
                    aria-expanded={expanded}
                    className="w-full p-5 text-left hover:bg-stone-800/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3 gap-4">
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
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-stone-400 text-sm">
                        Total: <span className="text-white font-semibold">{formatPrice(orderTotal)}</span>
                        {typeof taxCents === 'number' && taxCents > 0 && (
                          <span className="ml-2 text-stone-500 text-xs">(includes {formatPrice(taxCents)} tax)</span>
                        )}
                      </span>
                      <span className="text-right">
                        <span className="block text-stone-600 text-xs">Order #{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className="block text-orange-400 text-xs mt-1">{expanded ? 'Hide items −' : 'View items +'}</span>
                      </span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-stone-800 px-5 py-4">
                      {items.length > 0 ? (
                        <ul className="divide-y divide-stone-800">
                          {items.map((item, index) => {
                            const options = item.selected_options || {};
                            const optionLabels = [
                              options.size,
                              options.color,
                              ...(Array.isArray(options.variants)
                                ? options.variants.map(variant => variant.option)
                                : []),
                            ].filter(Boolean);
                            return (
                              <li key={`${order.id}-${item.product_id || item.name}-${index}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                <div>
                                  <p className="text-sm text-stone-200">{item.name}</p>
                                  {optionLabels.length > 0 && (
                                    <p className="text-xs text-stone-500 mt-1">{optionLabels.join(' · ')}</p>
                                  )}
                                  <p className="text-xs text-stone-500 mt-1">
                                    {item.quantity} × {formatPrice(item.price_cents)}
                                  </p>
                                </div>
                                <span className="text-sm text-stone-300 whitespace-nowrap">
                                  {formatPrice(item.price_cents * item.quantity)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-stone-500">Item details are unavailable for this order.</p>
                      )}
                      <div className="border-t border-stone-800 mt-4 pt-3 flex flex-col items-end gap-1 text-xs text-stone-500">
                        {typeof customizations.merchandise_subtotal_cents === 'number' && (
                          <p>Items: {formatPrice(customizations.merchandise_subtotal_cents)}</p>
                        )}
                        {typeof customizations.stripe_shipping_cents === 'number' && (
                          <p>Shipping: {formatPrice(customizations.stripe_shipping_cents)}</p>
                        )}
                        {typeof taxCents === 'number' && <p>Tax: {formatPrice(taxCents)}</p>}
                        <p className="text-stone-300 font-semibold">Paid total: {formatPrice(orderTotal)}</p>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
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
