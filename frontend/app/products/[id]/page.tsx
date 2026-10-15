'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct } from '../../../lib/api';
import Navbar from '../../components/Navbar';
import { useCart } from '../../../lib/cartContext';

const categoryLabels: Record<string, string> = {
  bag: 'Bags', water: 'Water', food: 'Food', medical: 'Medical',
  tools: 'Tools', shelter: 'Shelter', clothing: 'Clothing'
};

const categoryIcons: Record<string, string> = {
  bag: '🎒', water: '💧', food: '🥫', medical: '🩺',
  tools: '🔧', shelter: '⛺', clothing: '🧤'
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface Color { name: string; hex: string; in_stock?: boolean; price_cents?: number; }
interface SizeVariant { label: string; weight_grams?: number; dimensions?: string; notes?: string; price_cents?: number; in_stock?: boolean; colors?: Color[]; }
interface VariantOption { label: string; price_modifier_cents: number; }
interface VariantGroup { name: string; options: VariantOption[]; }
interface Product {
  id: string; name: string; description?: string; brand?: string;
  category: string; price_cents: number; weight_grams?: number;
  size?: string; sizes?: (SizeVariant | string)[]; in_stock: boolean; country_of_origin?: string;
  images?: string[];
  colors?: Color[];
  variant_groups?: VariantGroup[];
  image_fit?: string;
}

function isUSA(origin?: string) {
  return /\b(usa|u\.s\.a\.?|united states)\b/i.test(origin || '');
}

function displayWeight(grams: number): string {
  const oz = grams / 28.3495;
  if (oz < 16) return `${oz.toFixed(1)} oz`;
  const lbs = Math.floor(oz / 16);
  const remOz = oz % 16;
  if (remOz < 0.5) return `${lbs} lb${lbs !== 1 ? 's' : ''}`;
  return `${lbs} lb${lbs !== 1 ? 's' : ''} ${remOz.toFixed(1)} oz`;
}

// ── Image Gallery ──────────────────────────────────────────────────────────
function ImageGallery({ images, name, showFlag, imageFit }: { images: string[]; name: string; showFlag?: boolean; imageFit?: string }) {
  const [active, setActive] = useState(0);
  const contain = imageFit === 'contain';

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-stone-900/60 border border-stone-800 rounded flex items-center justify-center relative">
        <span className="text-stone-700 text-6xl">📦</span>
        {showFlag && (
          <div className="absolute bottom-3 left-3 bg-stone-950/80 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1.5 border border-stone-700">
            <img src="https://flagcdn.com/w20/us.png" alt="US flag" className="w-4 h-auto" />
            <span className="label-tactical text-stone-300 tracking-widest" style={{ fontSize: '0.7rem' }}>MADE IN U.S.A.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className={`w-full aspect-square border border-stone-800 rounded overflow-hidden relative ${contain ? 'bg-white' : 'bg-stone-900/60'}`}>
        <img
          src={images[active]}
          alt={`${name} — view ${active + 1}`}
          className={`w-full h-full ${contain ? 'object-contain' : 'object-cover'}`}
          onError={e => { (e.target as HTMLImageElement).src = ''; }}
        />
        {showFlag && (
          <div className="absolute bottom-3 left-3 bg-stone-950/80 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1.5 border border-stone-700">
            <img src="https://flagcdn.com/w20/us.png" alt="US flag" className="w-4 h-auto" />
            <span className="label-tactical text-stone-300 tracking-widest" style={{ fontSize: '0.7rem' }}>MADE IN U.S.A.</span>
          </div>
        )}
      </div>

      {/* Thumbnails — scrollable */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`shrink-0 w-16 h-16 rounded border overflow-hidden transition-all ${
                active === i ? 'border-orange-500' : 'border-stone-700 hover:border-stone-500'
              }`}
            >
              <img src={url} alt={`Thumbnail ${i + 1}`} className={`w-full h-full ${contain ? 'object-contain bg-white' : 'object-cover'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Color Swatches ─────────────────────────────────────────────────────────
function ColorPicker({ colors, selected, onChange }: {
  colors: Color[]; selected: number; onChange: (i: number) => void;
}) {
  if (!colors || colors.length === 0) return null;
  const selectedColor = colors[selected];
  const hasPrices = colors.some(c => c.price_cents && c.price_cents > 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="label-tactical text-stone-500">Color:</span>
        <span className="text-stone-300 text-sm font-semibold">{selectedColor?.name || ''}</span>
        {selectedColor?.price_cents ? (
          <span className="label-tactical text-orange-400/70 text-xs">{formatPrice(selectedColor.price_cents)}</span>
        ) : null}
        {selectedColor?.in_stock === false && (
          <span className="label-tactical text-red-500 text-xs">— Out of Stock</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => {
          const outOfStock = color.in_stock === false;
          const priceLabel = color.price_cents ? formatPrice(color.price_cents) : null;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <button
                onClick={() => onChange(i)}
                title={`${color.name}${priceLabel ? ` — ${priceLabel}` : ''}${outOfStock ? ' — Out of Stock' : ''}`}
                disabled={outOfStock}
                className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                  outOfStock
                    ? 'border-stone-800 opacity-40 cursor-not-allowed'
                    : selected === i
                    ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/20'
                    : 'border-stone-700 hover:border-stone-400'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {outOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="block w-full h-px bg-stone-300/60 rotate-45 scale-110" />
                  </span>
                )}
              </button>
              {hasPrices && priceLabel && (
                <span className="label-tactical text-stone-500 text-xs">{priceLabel}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Size Picker ────────────────────────────────────────────────────────────
function SizePicker({ sizes, selected, onChange }: {
  sizes: (SizeVariant | string)[]; selected: number; onChange: (i: number) => void;
}) {
  if (!sizes || sizes.length === 0) return null;

  const variants: SizeVariant[] = sizes.map(s =>
    typeof s === 'string' ? { label: s } : s
  );
  const active = variants[selected];
  const hasPricing = variants.some(v => v.price_cents);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="label-tactical text-stone-500">Size:</span>
        <span className="text-stone-300 text-sm font-semibold">{active?.label || ''}</span>
      </div>

      {/* Size buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {variants.map((sv, i) => {
          const outOfStock = sv.in_stock === false;
          return (
            <button
              key={i}
              onClick={() => !outOfStock && onChange(i)}
              disabled={outOfStock}
              className={`px-4 py-2 rounded border text-sm font-semibold uppercase tracking-wider transition-all flex flex-col items-center ${
                outOfStock
                  ? 'border-stone-800 text-stone-700 cursor-not-allowed opacity-50'
                  : selected === i
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white'
              }`}
            >
              <span>{sv.label}</span>
              {outOfStock
                ? <span className="text-xs font-normal mt-0.5 normal-case tracking-normal">Sold Out</span>
                : hasPricing && sv.price_cents
                ? <span className="text-xs font-normal opacity-70 mt-0.5">{formatPrice(sv.price_cents)}</span>
                : null
              }
            </button>
          );
        })}
      </div>

      {/* Per-variant specs */}
      {(active?.weight_grams || active?.dimensions || active?.notes) && (
        <div className="bg-stone-900/60 border border-stone-800 rounded p-3 flex flex-col gap-2">
          {(active.weight_grams || active.dimensions) && (
            <div className="flex flex-wrap gap-4">
              {active.weight_grams && (
                <div>
                  <p className="label-tactical text-stone-600 mb-0.5" style={{ fontSize: '0.7rem' }}>WEIGHT</p>
                  <p className="text-stone-300 text-sm font-semibold">{displayWeight(active.weight_grams)}</p>
                </div>
              )}
              {active.dimensions && (
                <div>
                  <p className="label-tactical text-stone-600 mb-0.5" style={{ fontSize: '0.7rem' }}>DIMENSIONS</p>
                  <p className="text-stone-300 text-sm font-semibold">{active.dimensions}</p>
                </div>
              )}
            </div>
          )}
          {active.notes && (
            <p className="text-stone-400 text-xs leading-relaxed border-t border-stone-800 pt-2">{active.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Variant Group Picker ────────────────────────────────────────────────────
function VariantGroupPicker({ group, selected, onChange }: {
  group: VariantGroup; selected: number; onChange: (i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="label-tactical text-stone-500">{group.name}:</span>
        <span className="text-stone-300 text-sm font-semibold">{group.options[selected]?.label || ''}</span>
        {group.options[selected]?.price_modifier_cents !== 0 && (
          <span className="text-orange-400 text-xs">
            {group.options[selected]?.price_modifier_cents > 0 ? '+' : ''}{formatPrice(group.options[selected]?.price_modifier_cents)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {group.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`px-4 py-2 rounded border text-sm font-semibold uppercase tracking-wider transition-all flex flex-col items-center ${
              selected === i
                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                : 'border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white'
            }`}
          >
            <span>{opt.label}</span>
            {opt.price_modifier_cents !== 0 && (
              <span className="text-xs font-normal opacity-70 mt-0.5">
                {opt.price_modifier_cents > 0 ? '+' : ''}{formatPrice(opt.price_modifier_cents)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    if (!params?.id) return;
    getProduct(params.id as string)
      .then((data: Product) => {
        setProduct(data);
        setSelectedVariants((data.variant_groups || []).map(() => 0));

        setLoading(false);
      })
      .catch(() => { setError('Product not found.'); setLoading(false); });
  }, [params?.id]);

  // Reset selected color when size changes (each size has its own color list)
  useEffect(() => { setSelectedColor(0); }, [selectedSize]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <p className="label-tactical text-stone-500 tracking-widest">Loading...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-stone-950 text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-red-400 mb-4">{error || 'Product not found.'}</p>
          <Link href="/products" className="text-orange-500 hover:text-orange-400 text-sm uppercase tracking-widest">← Browse Products</Link>
        </div>
      </main>
    );
  }

  // Compute displayed price from selected size + variant modifiers + color modifier
  const sizeVariants = (product.sizes || []).map(s => typeof s === 'string' ? { label: s } : s) as SizeVariant[];
  const selectedSizeVariant = sizeVariants[selectedSize];
  const currentColors: Color[] = (selectedSizeVariant?.colors?.length ? selectedSizeVariant.colors : product.colors) ?? [];
  const basePrice = selectedSizeVariant?.price_cents ?? product.price_cents;
  const variantModifiers = (product.variant_groups || []).reduce((sum, grp, gi) => {
    const opt = grp.options[selectedVariants[gi] ?? 0];
    return sum + (opt?.price_modifier_cents ?? 0);
  }, 0);
  const colorAbsolutePrice = currentColors[selectedColor]?.price_cents ?? null;
  const displayPrice = (colorAbsolutePrice ? colorAbsolutePrice : basePrice) + variantModifiers;

  function handleAddToCart() {
    addItem({
      id: product!.id,
      type: 'product',
      name: product!.name,
      image_url: product!.images?.[0],
      price_cents: displayPrice,
      quantity: 1,
      selectedColor: currentColors[selectedColor]?.name,
      selectedSize: sizeVariants[selectedSize]?.label,
      selectedVariants: [...selectedVariants],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 label-tactical text-stone-600 mb-8">
          <Link href="/products" className="hover:text-orange-400 transition-colors">Products</Link>
          <span>/</span>
          <span className="text-stone-400">{product.name}</span>
        </div>

        {/* ── Main product layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">

          {/* Left: Image gallery */}
          <ImageGallery images={product.images || []} name={product.name} showFlag={isUSA(product.country_of_origin)} imageFit={product.image_fit} />

          {/* Right: Info */}
          <div className="flex flex-col gap-6">

            {/* Category + stock badge */}
            <div className="flex items-center gap-3">
              <span className="label-tactical text-stone-500">
                {categoryIcons[product.category]} {categoryLabels[product.category] || product.category}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded uppercase tracking-wider font-semibold ${
                product.in_stock ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'
              }`}>
                {product.in_stock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {/* Brand + name + price */}
            <div>
              {product.brand && (
                <p className="label-tactical text-orange-500/80 mb-1 tracking-wider">{product.brand}</p>
              )}
              <h1 className="text-4xl font-extrabold uppercase tracking-wide mb-3">{product.name}</h1>
              <p className="text-3xl font-extrabold text-orange-500">{formatPrice(displayPrice)}</p>
            </div>

            {/* Made in USA banner */}
            {isUSA(product.country_of_origin) && (
              <div className="flex items-center gap-3 border-l-2 border-red-500 pl-3 py-1">
                <img src="https://flagcdn.com/w20/us.png" alt="US flag" className="w-7 h-auto" />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white">Made in the U.S.A.</p>
                  <p className="label-tactical text-stone-500 mt-0.5">American-made product</p>
                </div>
              </div>
            )}

            {/* Color picker */}
            {currentColors.length > 0 && (
              <ColorPicker
                colors={currentColors}
                selected={selectedColor}
                onChange={setSelectedColor}
              />
            )}

            {/* Size picker */}
            {product.sizes && product.sizes.length > 0 && (
              <SizePicker
                sizes={product.sizes}
                selected={selectedSize}
                onChange={setSelectedSize}
              />
            )}

            {/* Variant group pickers */}
            {(product.variant_groups || []).map((grp, gi) => (
              grp.options.length > 0 && (
                <VariantGroupPicker
                  key={gi}
                  group={grp}
                  selected={selectedVariants[gi] ?? 0}
                  onChange={i => setSelectedVariants(prev => { const n = [...prev]; n[gi] = i; return n; })}
                />
              )
            ))}

            {/* Description */}
            {product.description && (
              <p className="text-stone-300 leading-relaxed text-sm border-t border-stone-800 pt-4 whitespace-pre-wrap">
                {product.description}
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-col gap-3 mt-auto">
              {product.in_stock && (
                <button
                  onClick={handleAddToCart}
                  className={`text-white text-xs font-bold uppercase tracking-widest px-6 py-4 rounded transition-colors text-center ${
                    added ? 'bg-green-600 hover:bg-green-500' : 'bg-orange-600 hover:bg-orange-500'
                  }`}
                >
                  {added ? 'Added to Cart ✓' : 'Add to Cart →'}
                </button>
              )}
              <div className="bg-stone-900/80 border border-orange-500/20 rounded p-5 flex flex-col gap-3">
                <p className="label-tactical text-orange-500 tracking-[0.15em]">// This item is included in custom kits</p>
                <p className="text-stone-400 text-sm leading-relaxed">
                  Take the assessment and we'll recommend the right kit for your situation.
                </p>
                <Link
                  href="/quiz"
                  className="border border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-orange-300 text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors text-center"
                >
                  Build a Kit →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Specs table ── */}
        <div className="bg-stone-900/80 border border-stone-800 rounded p-6">
          <p className="label-tactical text-stone-500 mb-4">// Specifications</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12">
            <div className="flex flex-col gap-0">
              <div className="flex justify-between border-b border-stone-800 py-2.5">
                <span className="label-tactical text-stone-600">Category</span>
                <span className="text-stone-300 text-sm">{categoryLabels[product.category] || product.category}</span>
              </div>
              {product.brand && (
                <div className="flex justify-between border-b border-stone-800 py-2.5">
                  <span className="label-tactical text-stone-600">Brand</span>
                  <span className="text-stone-300 text-sm">{product.brand}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-stone-800 py-2.5">
                <span className="label-tactical text-stone-600">Price</span>
                <span className="text-white font-bold">{formatPrice(displayPrice)}</span>
              </div>
              <div className="flex justify-between border-b border-stone-800 py-2.5">
                <span className="label-tactical text-stone-600">Made in</span>
                <span className="text-stone-300 text-sm">{product.country_of_origin || '—'}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="label-tactical text-stone-600">Availability</span>
                <span className={`text-sm font-semibold ${product.in_stock ? 'text-green-500' : 'text-red-400'}`}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-0">
              {product.weight_grams && (
                <div className="flex justify-between border-b border-stone-800 py-2.5">
                  <span className="label-tactical text-stone-600">Weight</span>
                  <span className="text-stone-300 text-sm">{displayWeight(product.weight_grams)}</span>
                </div>
              )}
              {product.size && (
                <div className="flex justify-between border-b border-stone-800 py-2.5">
                  <span className="label-tactical text-stone-600">Size</span>
                  <span className="text-stone-300 text-sm">{product.size}</span>
                </div>
              )}
              {currentColors.length > 0 && (
                <div className="flex justify-between py-2.5">
                  <span className="label-tactical text-stone-600">Colors</span>
                  <div className="flex items-center gap-1.5">
                    {currentColors.map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full border border-stone-600" style={{ backgroundColor: c.hex }} title={c.name} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link href="/products" className="label-tactical text-stone-500 hover:text-orange-400 transition-colors tracking-widest">
            ← Back to Kits
          </Link>
        </div>
      </div>
    </main>
  );
}
