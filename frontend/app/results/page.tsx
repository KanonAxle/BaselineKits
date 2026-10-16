// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { useCart } from '../../lib/cartContext';
import Link from 'next/link';
import { calculateShippingCents } from '../../lib/shippingPricing';

function isBag(item: any): boolean {
  // Check category first (most reliable)
  if (item.category === 'bag') return true;
  // Fallback to name matching
  const name = (item.name || '').toLowerCase();
  return name.includes('bag') || name.includes('backpack') || item.is_bag;
}

export default function ResultsPage() {
  const router = useRouter();
  const [kit, setKit] = useState(null);
  const [removedItems, setRemovedItems] = useState([]);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartAction, setCartAction] = useState<'idle' | 'ordering'>('idle');
  const [quickViewItem, setQuickViewItem] = useState(null);
  const [bagRemovalWarning, setBagRemovalWarning] = useState(null);
  const { addItem, items: cartItems } = useCart();

  useEffect(() => {
    const stored = localStorage.getItem('quizResult');
    if (!stored) { router.push('/quiz'); return; }
    const parsed = JSON.parse(stored);
    setKit(parsed.recommended_kit);
  }, [router]);

  const kitDescription = kit?.description || 'This recommendation was selected based on your answers and household situation. You can remove extra items or continue with the full kit as-is.';
  const productCount = kit?.items?.filter((item: any) => item.type !== 'subkit_header').length || 0;
  const topHighlights = [
    'Built around your answers',
    `${productCount} selected essentials`,
    'Customizable before checkout',
  ];
  const featuredItems = kit?.items?.filter((item: any) => item.type !== 'subkit_header').slice(0, 3) || [];

  function toggleItem(itemId: string) {
    // Check if this is a bag being removed
    const item = kit.items.find(i => (i.product_id || i.sub_kit_id) === itemId);
    const isRemoving = !removedItems.includes(itemId);
    
    if (item && isRemoving && isBag(item)) {
      setBagRemovalWarning(item);
      return;
    }
    
    setRemovedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  }

  function confirmBagRemoval() {
    if (bagRemovalWarning) {
      const itemId = bagRemovalWarning.product_id || bagRemovalWarning.sub_kit_id;
      setRemovedItems(prev => [...prev, itemId]);
      setBagRemovalWarning(null);
    }
  }

  function calculateTotal() {
    if (!kit) return 0;
    const activeItems = kit.items.filter(item =>
      item.type !== 'subkit_header' && !removedItems.includes(item.product_id || item.sub_kit_id)
    );
    return activeItems.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function buildCartItem() {
    return {
      id: kit.id,
      type: 'kit' as const,
      name: kit.name,
      image_url: kit.image_url || kit.images?.[0],
      price_cents: calculateTotal(),
      quantity: 1,
      removedItems,
    };
  }

  function isKitAlreadyInCart() {
    return cartItems.some(item =>
      item.type === 'kit' &&
      item.id === kit.id &&
      JSON.stringify(item.removedItems || []) === JSON.stringify(removedItems)
    );
  }

  function handleAddKitToCart() {
    if (cartAction !== 'idle') return;
    if (!isKitAlreadyInCart()) addItem(buildCartItem());
    setAddedToCart(true);
  }

  function handleOrderNow() {
    if (cartAction !== 'idle') return;
    setCartAction('ordering');
    if (!isKitAlreadyInCart()) addItem(buildCartItem());
    router.push('/cart');
  }

  if (!kit) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Loading your kit...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="mb-3 text-orange-500 text-sm font-semibold uppercase tracking-widest">Your Recommendation</div>
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-400">
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-orange-400">Built for your answers</span>
          <span className="rounded-full border border-stone-700 px-3 py-1.5">{productCount} items</span>
          <span className="rounded-full border border-stone-700 px-3 py-1.5">Customizable</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{kit.name}</h1>
        <p className="text-stone-300 mb-6 leading-relaxed">{kitDescription}</p>

        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          {topHighlights.map((item) => (
            <div key={item} className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Recommended</div>
              <div className="mt-2 text-sm font-medium text-stone-100">{item}</div>
            </div>
          ))}
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h2 className="font-semibold">Why this kit fits</h2>
            <span className="text-xs uppercase tracking-[0.15em] text-orange-400">Best match</span>
          </div>
          <p className="text-stone-300 leading-relaxed mb-4">
            This kit was selected to match your household, preparation priorities, and the supplies most likely to be useful in your situation.
          </p>
          <div className="flex flex-wrap gap-2">
            {featuredItems.map((item, idx) => {
              const id = item.product_id || item.sub_kit_id;
              const removed = removedItems.includes(id);
              return (
                <button
                  key={idx}
                  onClick={() => setQuickViewItem(item)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-all cursor-pointer underline ${
                    removed
                      ? 'border border-stone-700 bg-stone-800/50 opacity-40 line-through'
                      : 'border border-orange-500/30 bg-orange-500/10 hover:border-orange-500/60 hover:bg-orange-500/20 hover:text-orange-200'
                  }`}
                >
                  {item.name} {removed ? '✕' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Kit Items */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold">Kit Contents</h2>
            <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Click to remove items</span>
          </div>
          <div className="flex flex-col gap-3">
            {kit.items.map((item, index) => {
              if (item.type === 'subkit_header') {
                return (
                  <div key={`header-${item.sub_kit_id}-${index}`} className="flex items-center gap-3 pt-2 pb-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-400/70">
                      {item.name}
                    </span>
                    <div className="flex-1 h-px bg-stone-800" />
                  </div>
                );
              }
              const id = item.product_id || item.sub_kit_id;
              const removed = removedItems.includes(id);
              return (
                <div key={`item-${id}-${index}`} 
                  onClick={() => setQuickViewItem(item)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all ${removed ? 'border-stone-700 bg-stone-800/50 opacity-40 line-through' : 'border-stone-700 hover:border-stone-500'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${removed ? 'border-stone-600' : 'border-orange-500 bg-orange-500'}`}>
                      {!removed && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span>{item.name}</span>
                    {item.quantity > 1 && <span className="text-stone-500 text-sm">×{item.quantity}</span>}
                    {item.type === 'kit' && (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400">Kit</span>
                    )}
                  </div>
                  <span className="text-stone-400 text-sm">{formatPrice(item.price_cents * item.quantity)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-stone-900 border border-stone-800 rounded-xl px-6 py-5">
          <div>
            <div className="flex justify-between gap-6 text-sm text-stone-400">
              <span>Kit subtotal</span><span>{formatPrice(calculateTotal())}</span>
            </div>
            <div className="flex justify-between gap-6 text-sm text-stone-400 mt-1">
              <span>Shipping</span>
              <span>{calculateShippingCents(calculateTotal()) ? formatPrice(calculateShippingCents(calculateTotal())) : 'Free'}</span>
            </div>
            <div className="text-stone-400 text-sm mt-2">Estimated total before tax</div>
            <div className="text-3xl font-bold">{formatPrice(calculateTotal() + calculateShippingCents(calculateTotal()))}</div>
            <p className="text-xs text-stone-500 mt-1">Applicable tax is calculated at checkout.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button type="button" onClick={handleAddKitToCart} disabled={cartAction !== 'idle'}
              className="border border-orange-500 text-orange-400 hover:bg-orange-500/10 font-semibold px-6 py-4 rounded-lg transition-colors text-sm text-center">
              {addedToCart ? 'Added to Cart ✓' : 'Add to Cart →'}
            </button>
            <button type="button" onClick={handleOrderNow} disabled={cartAction !== 'idle'}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-center">
              {cartAction === 'ordering' ? 'Opening Cart...' : 'Order Now →'}
            </button>
          </div>
        </div>
        {addedToCart && (
          <p className="text-center text-sm text-green-400 mt-4">
            This kit is in your cart. <Link href="/cart" className="underline hover:text-green-300">Go to cart</Link>
          </p>
        )}
        <p className="text-center text-xs text-stone-500 mt-4">
          Checkout requires an account.{' '}
          <Link href="/login?next=%2Fcart" className="text-orange-400 underline hover:text-orange-300">Log in</Link>
          {' '}or{' '}
          <Link href="/register?next=%2Fcart" className="text-orange-400 underline hover:text-orange-300">create an account</Link>.
        </p>
      </div>

      {/* Bag Removal Warning Modal */}
      {bagRemovalWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2">⚠️ Removing Bag</h3>
            <div className="text-stone-300 mb-4 text-sm space-y-3">
              <p>
                Your kit is designed to be organized and packed inside <strong>{bagRemovalWarning.name}</strong>.
              </p>
              <p>If you remove it, your kit will arrive packed in just a box without:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Organization layout chart</li>
                <li>Packing guide</li>
                <li>Protective backpack structure</li>
              </ul>
              <p>You'll need to source your own backpack if removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBagRemovalWarning(null)}
                className="flex-1 border border-stone-700 hover:border-stone-500 text-stone-300 font-semibold px-4 py-2 rounded-lg transition-colors">
                Keep It
              </button>
              <button onClick={confirmBagRemoval}
                className="flex-1 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 font-semibold px-4 py-2 rounded-lg transition-colors">
                Remove Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-8">
          <div className="bg-stone-900 border border-stone-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
              <button 
                onClick={() => window.open(`/products/${quickViewItem.product_id}`, '_blank')}
                className="flex-1 text-left hover:text-orange-400 transition-colors"
              >
                <h2 className="text-xl font-semibold underline cursor-pointer">{quickViewItem.name}</h2>
              </button>
              <button onClick={() => setQuickViewItem(null)} className="text-stone-500 hover:text-stone-300 text-2xl">✕</button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-6 py-6">
              {/* Images */}
              {Array.isArray(quickViewItem.images) && quickViewItem.images.length > 0 && (
                <div className="mb-6">
                  <div className="bg-stone-800 rounded-lg overflow-hidden mb-3">
                    <img 
                      src={quickViewItem.images[0]} 
                      alt={quickViewItem.name} 
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  {quickViewItem.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {quickViewItem.images.map((img, i) => (
                        <img 
                          key={i}
                          src={img} 
                          alt={`${quickViewItem.name} ${i}`} 
                          className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <div className="text-stone-500 text-xs uppercase tracking-widest mb-1">Price</div>
                  <div className="text-2xl font-bold text-orange-400">{formatPrice(quickViewItem.price_cents)}</div>
                </div>

                {quickViewItem.brand && (
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-widest mb-1">Brand</div>
                    <div className="text-stone-300">{quickViewItem.brand}</div>
                  </div>
                )}

                {quickViewItem.description && (
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-widest mb-1">Description</div>
                    <div className="text-stone-300 text-sm leading-relaxed">{quickViewItem.description}</div>
                  </div>
                )}

                {quickViewItem.quantity > 1 && (
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-widest mb-1">Quantity in Kit</div>
                    <div className="text-stone-300">{quickViewItem.quantity}×</div>
                  </div>
                )}

                {quickViewItem.weight_grams && (
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-widest mb-1">Weight</div>
                    <div className="text-stone-300">{(quickViewItem.weight_grams / 453.592).toFixed(2)} lbs</div>
                  </div>
                )}

                {quickViewItem.category && (
                  <div>
                    <div className="text-stone-500 text-xs uppercase tracking-widest mb-1">Category</div>
                    <div className="text-stone-300 capitalize">{quickViewItem.category}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-stone-800 px-6 py-4 flex gap-3">
              {(() => {
                const itemId = quickViewItem.product_id || quickViewItem.sub_kit_id;
                const isRemoved = removedItems.includes(itemId);
                return (
                  <>
                    <button 
                      onClick={() => { setQuickViewItem(null); toggleItem(itemId); }}
                      className={`flex-1 font-semibold px-4 py-3 rounded-lg transition-colors text-sm ${
                        isRemoved
                          ? 'bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-green-400'
                          : 'bg-orange-600/20 border border-orange-500/30 hover:bg-orange-600/30 text-orange-400'
                      }`}
                    >
                      {isRemoved ? '+ Add to Kit' : '✕ Remove from Kit'}
                    </button>
                    <button 
                      onClick={() => window.open(`/products/${quickViewItem.product_id}`, '_blank')}
                      className="flex-1 bg-stone-800 border border-stone-700 hover:border-orange-500 text-white font-semibold px-4 py-3 rounded-lg transition-colors text-sm"
                    >
                      View Full Page →
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
