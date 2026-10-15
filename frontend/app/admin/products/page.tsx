// @ts-nocheck
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminGetProducts, getAdminToken,
  adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminImportUrl, adminUploadImage
} from '../../../lib/api';

const CATEGORIES = ['bag', 'water', 'food', 'medical', 'tools', 'shelter', 'clothing'];

const categoryLabels = {
  bag: 'Bags', water: 'Water', food: 'Food', medical: 'Medical',
  tools: 'Tools', shelter: 'Shelter', clothing: 'Clothing'
};

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

type SizeColorVariant = { name: string; hex: string; in_stock: boolean; price: string };
type SizeVariant = { label: string; price: string; weight_lbs: string; dimensions: string; notes: string; in_stock: boolean; colors: SizeColorVariant[] };
type VariantOption = { label: string; price_modifier: string };
type VariantGroup = { name: string; options: VariantOption[] };

const emptyForm = {
  name: '', description: '', brand: '', category: 'tools',
  price: '', cost: '', weight_lbs: '', size: '',
  country_of_origin: '', in_stock: true, requires_sizing: false, is_visible: false, link: '',
  image_fit: 'contain' as 'cover' | 'contain',
  images: [] as string[],
  colors: [] as { name: string; hex: string; in_stock: boolean; price: string }[],
  sizes: [] as SizeVariant[],
  variant_groups: [] as VariantGroup[],
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadTargetIdx, setUploadTargetIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    if (!getAdminToken()) {
      router.push('/admin');
      return;
    }
    loadProducts();
  }, [router]);

  async function loadProducts() {
    try {
      const data = await adminGetProducts();
      setProducts(data);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleProductVisibility(product) {
    const nextVisibility = product.is_visible === false;
    setVisibilityUpdatingId(product.id);
    setError('');
    try {
      const updated = await adminUpdateProduct(product.id, { is_visible: nextVisibility });
      setProducts(prev => prev.map(item => item.id === product.id ? updated : item));
    } catch (err) {
      setError(err.message || `Failed to ${nextVisibility ? 'show' : 'hide'} ${product.name}.`);
    } finally {
      setVisibilityUpdatingId(null);
    }
  }

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError('');
    setImportUrl('');
    setImportMsg(null);
    setShowForm(true);
  }

  function openEditForm(product) {
    setForm({
      name: product.name || '',
      description: product.description || '',
      brand: product.brand || '',
      category: product.category || 'tools',
      price: product.price_cents ? (product.price_cents / 100).toFixed(2) : '',
      cost: product.cost_cents ? (product.cost_cents / 100).toFixed(2) : '',
      weight_lbs: product.weight_grams ? (product.weight_grams / 453.592).toFixed(2) : '',
      size: product.size || '',
      country_of_origin: product.country_of_origin || '',
      in_stock: product.in_stock !== false,
      requires_sizing: product.requires_sizing || false,
      is_visible: product.is_visible !== false,
      link: product.link || '',
      image_fit: (product.image_fit === 'cover' ? 'cover' : 'contain') as 'cover' | 'contain',
      images: Array.isArray(product.images) ? product.images.map(u => u ?? '') : [],
      colors: Array.isArray(product.colors) ? product.colors.map(c => ({ name: c?.name ?? '', hex: c?.hex ?? '#888888', in_stock: c?.in_stock !== false, price: c?.price_cents != null ? (c.price_cents / 100).toFixed(2) : '' })) : [],
      sizes: Array.isArray(product.sizes)
        ? product.sizes.map(s =>
            typeof s === 'string'
              ? { label: s, price: '', weight_lbs: '', dimensions: '', notes: '', in_stock: true, colors: [] }
              : { label: s.label || '', price: s.price_cents ? (s.price_cents / 100).toFixed(2) : '', weight_lbs: s.weight_grams ? (s.weight_grams / 453.592).toFixed(2) : '', dimensions: s.dimensions || '', notes: s.notes || '', in_stock: s.in_stock !== false, colors: Array.isArray(s.colors) ? s.colors.map(c => ({ name: c?.name ?? '', hex: c?.hex ?? '#888888', in_stock: c?.in_stock !== false, price: c?.price_cents != null ? (c.price_cents / 100).toFixed(2) : '' })) : [] }
          )
        : [],
      variant_groups: Array.isArray(product.variant_groups)
        ? product.variant_groups.map(g => ({
            name: g.name || '',
            options: (g.options || []).map(o => ({
              label: o.label || '',
              price_modifier: o.price_modifier_cents != null ? (o.price_modifier_cents / 100).toFixed(2) : '0',
            })),
          }))
        : [],
    });
    setEditingId(product.id);
    setFormError('');
    setImportUrl('');
    setImportMsg(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDuplicateForm(product) {
    setForm({
      name: `Copy of ${product.name || ''}`,
      description: product.description || '',
      brand: product.brand || '',
      category: product.category || 'tools',
      price: product.price_cents ? (product.price_cents / 100).toFixed(2) : '',
      cost: product.cost_cents ? (product.cost_cents / 100).toFixed(2) : '',
      weight_lbs: product.weight_grams ? (product.weight_grams / 453.592).toFixed(2) : '',
      size: product.size || '',
      country_of_origin: product.country_of_origin || '',
      in_stock: product.in_stock !== false,
      requires_sizing: product.requires_sizing || false,
      is_visible: product.is_visible !== false,
      link: product.link || '',
      image_fit: (product.image_fit === 'cover' ? 'cover' : 'contain') as 'cover' | 'contain',
      images: Array.isArray(product.images) ? product.images.map(u => u ?? '') : [],
      colors: Array.isArray(product.colors) ? product.colors.map(c => ({ name: c?.name ?? '', hex: c?.hex ?? '#888888', in_stock: c?.in_stock !== false, price: c?.price_cents != null ? (c.price_cents / 100).toFixed(2) : '' })) : [],
      sizes: Array.isArray(product.sizes)
        ? product.sizes.map(s =>
            typeof s === 'string'
              ? { label: s, price: '', weight_lbs: '', dimensions: '', notes: '', in_stock: true, colors: [] }
              : { label: s.label || '', price: s.price_cents ? (s.price_cents / 100).toFixed(2) : '', weight_lbs: s.weight_grams ? (s.weight_grams / 453.592).toFixed(2) : '', dimensions: s.dimensions || '', notes: s.notes || '', in_stock: s.in_stock !== false, colors: Array.isArray(s.colors) ? s.colors.map(c => ({ name: c?.name ?? '', hex: c?.hex ?? '#888888', in_stock: c?.in_stock !== false, price: c?.price_cents != null ? (c.price_cents / 100).toFixed(2) : '' })) : [] }
          )
        : [],
      variant_groups: Array.isArray(product.variant_groups)
        ? product.variant_groups.map(g => ({
            name: g.name || '',
            options: (g.options || []).map(o => ({
              label: o.label || '',
              price_modifier: o.price_modifier_cents != null ? (o.price_modifier_cents / 100).toFixed(2) : '0',
            })),
          }))
        : [],
    });
    setEditingId(null);
    setFormError('');
    setImportUrl('');
    setImportMsg(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }

  // ── Image helpers ──
  function addImage() {
    setForm(f => ({ ...f, images: [...f.images, ''] }));
  }
  function updateImage(idx: number, val: string) {
    setForm(f => { const imgs = [...f.images]; imgs[idx] = val; return { ...f, images: imgs }; });
  }
  function removeImage(idx: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }
  function moveImage(from: number, to: number) {
    if (from === to) return;
    setForm(f => {
      const imgs = [...f.images];
      const [item] = imgs.splice(from, 1);
      imgs.splice(to, 0, item);
      return { ...f, images: imgs };
    });
  }

  // ── Color helpers ──
  function addColor() {
    setForm(f => ({ ...f, colors: [...f.colors, { name: '', hex: '#888888', in_stock: true, price: '' }] }));
  }
  function updateColor(idx: number, field: 'name' | 'hex' | 'price', val: string) {
    setForm(f => { const cols = [...f.colors]; cols[idx] = { ...cols[idx], [field]: val }; return { ...f, colors: cols }; });
  }
  function toggleColorInStock(idx: number) {
    setForm(f => { const cols = [...f.colors]; cols[idx] = { ...cols[idx], in_stock: !cols[idx].in_stock }; return { ...f, colors: cols }; });
  }
  function removeColor(idx: number) {
    setForm(f => ({ ...f, colors: f.colors.filter((_, i) => i !== idx) }));
  }

  // ── Size helpers ──
  function addSize() {
    setForm(f => ({ ...f, sizes: [...f.sizes, { label: '', price: '', weight_lbs: '', dimensions: '', notes: '', in_stock: true, colors: [] }] }));
  }
  function updateSize(idx: number, field: keyof SizeVariant, val: string) {
    setForm(f => { const s = [...f.sizes]; s[idx] = { ...s[idx], [field]: val }; return { ...f, sizes: s }; });
  }
  function removeSize(idx: number) {
    setForm(f => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }));
  }
  function toggleSizeInStock(idx: number) {
    setForm(f => { const s = [...f.sizes]; s[idx] = { ...s[idx], in_stock: !s[idx].in_stock }; return { ...f, sizes: s }; });
  }
  function addSizeColor(sIdx: number) {
    setForm(f => { const s = [...f.sizes]; s[sIdx] = { ...s[sIdx], colors: [...s[sIdx].colors, { name: '', hex: '#888888', in_stock: true, price: '' }] }; return { ...f, sizes: s }; });
  }
  function updateSizeColor(sIdx: number, cIdx: number, field: 'name' | 'hex' | 'price', val: string) {
    setForm(f => { const s = [...f.sizes]; const cols = [...s[sIdx].colors]; cols[cIdx] = { ...cols[cIdx], [field]: val }; s[sIdx] = { ...s[sIdx], colors: cols }; return { ...f, sizes: s }; });
  }
  function toggleSizeColorInStock(sIdx: number, cIdx: number) {
    setForm(f => { const s = [...f.sizes]; const cols = [...s[sIdx].colors]; cols[cIdx] = { ...cols[cIdx], in_stock: !cols[cIdx].in_stock }; s[sIdx] = { ...s[sIdx], colors: cols }; return { ...f, sizes: s }; });
  }
  function removeSizeColor(sIdx: number, cIdx: number) {
    setForm(f => { const s = [...f.sizes]; s[sIdx] = { ...s[sIdx], colors: s[sIdx].colors.filter((_, i) => i !== cIdx) }; return { ...f, sizes: s }; });
  }

  // ── Variant group helpers ──
  function addVariantGroup() {
    setForm(f => ({ ...f, variant_groups: [...f.variant_groups, { name: '', options: [] }] }));
  }
  function updateVariantGroupName(idx: number, name: string) {
    setForm(f => { const vg = [...f.variant_groups]; vg[idx] = { ...vg[idx], name }; return { ...f, variant_groups: vg }; });
  }
  function removeVariantGroup(idx: number) {
    setForm(f => ({ ...f, variant_groups: f.variant_groups.filter((_, i) => i !== idx) }));
  }
  function addVariantOption(gIdx: number) {
    setForm(f => {
      const vg = [...f.variant_groups];
      vg[gIdx] = { ...vg[gIdx], options: [...vg[gIdx].options, { label: '', price_modifier: '0' }] };
      return { ...f, variant_groups: vg };
    });
  }
  function updateVariantOption(gIdx: number, oIdx: number, field: keyof VariantOption, val: string) {
    setForm(f => {
      const vg = [...f.variant_groups];
      const opts = [...vg[gIdx].options];
      opts[oIdx] = { ...opts[oIdx], [field]: val };
      vg[gIdx] = { ...vg[gIdx], options: opts };
      return { ...f, variant_groups: vg };
    });
  }
  function removeVariantOption(gIdx: number, oIdx: number) {
    setForm(f => {
      const vg = [...f.variant_groups];
      vg[gIdx] = { ...vg[gIdx], options: vg[gIdx].options.filter((_, i) => i !== oIdx) };
      return { ...f, variant_groups: vg };
    });
  }

  function handleUploadClick(idx: number) {
    setUploadTargetIdx(idx);
    fileInputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadTargetIdx == null) return;
    const idx = uploadTargetIdx;
    setUploadingIdx(idx);
    try {
      const url = await adminUploadImage(file);
      updateImage(idx, url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingIdx(null);
      setUploadTargetIdx(null);
      e.target.value = '';
    }
  }

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImportLoading(true);
    setImportMsg(null);
    try {
      const { product } = await adminImportUrl(importUrl.trim());
      const filled: string[] = [];
      setForm(f => {
        const next = { ...f };
        if (product.name)        { next.name = product.name;               filled.push('name'); }
        if (product.description) { next.description = product.description; filled.push('description'); }
        if (product.brand)       { next.brand = product.brand;             filled.push('brand'); }
        if (product.link)        { next.link = product.link;               filled.push('link'); }
        if (product.price_cents) { next.price = (product.price_cents / 100).toFixed(2); filled.push('price'); }
        if (product.images?.length) {
          next.images = product.images;
          filled.push(`${product.images.length} image${product.images.length > 1 ? 's' : ''}`);
        }
        return next;
      });
      setImportMsg({ type: 'success', text: `Imported: ${filled.join(', ')}` });
      setImportUrl('');
    } catch (err: unknown) {
      setImportMsg({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setImportLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name || !form.category || !form.price) {
      setFormError('Name, category, and price are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        brand: form.brand.trim() || null,
        category: form.category,
        price_cents: Math.round(parseFloat(form.price) * 100),
        cost_cents: form.cost ? Math.round(parseFloat(form.cost) * 100) : null,
        country_of_origin: form.country_of_origin.trim() || null,
        weight_grams: form.weight_lbs ? Math.round(parseFloat(form.weight_lbs) * 453.592) : null,
        size: form.size.trim() || null,
        in_stock: form.in_stock,
        requires_sizing: form.requires_sizing || false,
        is_visible: form.is_visible !== false,
        link: form.link.trim() || null,
        image_fit: form.image_fit || 'contain',
        images: form.images.filter(u => (u ?? '').trim()),
        colors: form.colors.filter(c => (c?.name ?? '').trim() || c?.hex).map(c => ({ name: c.name, hex: c.hex, in_stock: c.in_stock !== false, price_cents: c.price ? Math.round(parseFloat(c.price) * 100) : null })),
        sizes: form.sizes
          .filter(s => (s.label ?? '').trim())
          .map(s => ({
            label: s.label.trim(),
            price_cents: s.price ? Math.round(parseFloat(s.price) * 100) : null,
            weight_grams: s.weight_lbs ? Math.round(parseFloat(s.weight_lbs) * 453.592) : null,
            dimensions: (s.dimensions ?? '').trim() || null,
            notes: (s.notes ?? '').trim() || null,
            in_stock: s.in_stock !== false,
            colors: (s.colors || []).filter(c => (c?.name ?? '').trim() || c?.hex).map(c => ({
              name: c.name, hex: c.hex, in_stock: c.in_stock !== false,
              price_cents: c.price ? Math.round(parseFloat(c.price) * 100) : null,
            })),
          })),
        variant_groups: form.variant_groups
          .filter(g => g.name.trim())
          .map(g => ({
            name: g.name.trim(),
            options: g.options
              .filter(o => o.label.trim())
              .map(o => ({
                label: o.label.trim(),
                price_modifier_cents: o.price_modifier ? Math.round(parseFloat(o.price_modifier) * 100) : 0,
              })),
          })),
      };

      if (editingId) {
        const updated = await adminUpdateProduct(editingId, payload);
        setProducts(prev => prev.map(p => p.id === editingId ? updated : p));
      } else {
        const created = await adminCreateProduct(payload);
        setProducts(prev => [...prev, created]);
      }
      cancelForm();
    } catch (err) {
      setFormError(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteProduct(product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="label-tactical text-stone-500 tracking-widest">Loading products...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      {/* Admin Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">BaselineKits</Link>
          <span className="label-tactical text-stone-600">/ Products</span>
        </div>
        <Link href="/admin" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">← Dashboard</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Equipment Catalog</p>
            <h1 className="text-3xl font-extrabold uppercase tracking-wide">Manage Products</h1>
          </div>
          {!showForm && (
            <button
              onClick={openNewForm}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
            >
              + Add Product
            </button>
          )}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="bg-stone-900/80 border border-orange-500/30 rounded p-6 mb-8">
            <p className="label-tactical text-orange-500 mb-4 tracking-[0.15em]">
              {editingId ? '// Edit Product' : '// New Product'}
            </p>
            <form onSubmit={handleSave}>

              {/* ── Import from URL ─────────────────────────────────────── */}
              <div className="bg-stone-800/60 border border-stone-700 rounded p-4 mb-5">
                <p className="label-tactical text-stone-400 mb-3 tracking-widest">// Import from URL</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={e => { setImportUrl(e.target.value); setImportMsg(null); }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleImport())}
                    placeholder="Paste a product page URL to auto-fill fields..."
                    className="flex-1 bg-stone-900 border border-stone-700 rounded px-4 py-2.5 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importLoading || !importUrl.trim()}
                    className="shrink-0 px-5 py-2.5 bg-stone-700 hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded transition-colors"
                  >
                    {importLoading ? 'Fetching...' : 'Import'}
                  </button>
                </div>
                {importMsg && (
                  <p className={`mt-2 text-xs ${importMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {importMsg.type === 'success' ? '✓ ' : '✗ '}{importMsg.text}
                  </p>
                )}
                <p className="mt-2 text-stone-600 text-xs">Works with most retail sites. Amazon may not work due to bot protection. Review all imported fields before saving.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="label-tactical text-stone-500 mb-1 block">Product Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Tactical Flashlight"
                  />
                </div>

                {/* Supplier / Reference Link */}
                <div className="sm:col-span-2">
                  <label className="label-tactical text-stone-500 mb-1 block">
                    Supplier / Reference Link <span className="text-stone-600 normal-case font-normal">— admin only, used for ordering & invoices</span>
                  </label>
                  <input
                    type="url"
                    value={form.link}
                    onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="https://supplier.com/product/..."
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Streamlight"
                  />
                </div>

                {/* Made in */}
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Made in:</label>
                  <select
                    value={form.country_of_origin}
                    onChange={e => setForm(f => ({ ...f, country_of_origin: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">— Select country —</option>
                    <optgroup label="Most Common">
                      <option value="China">China</option>
                      <option value="India">India</option>
                      <option value="Pakistan">Pakistan</option>
                      <option value="USA">USA</option>
                      <option value="Vietnam">Vietnam</option>
                    </optgroup>
                    <optgroup label="Other Common Origins">
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Germany">Germany</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Japan">Japan</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Mexico">Mexico</option>
                      <option value="South Korea">South Korea</option>
                      <option value="Taiwan">Taiwan</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Turkey">Turkey</option>
                    </optgroup>
                    <optgroup label="All Countries">
                      <option value="Afghanistan">Afghanistan</option>
                      <option value="Albania">Albania</option>
                      <option value="Algeria">Algeria</option>
                      <option value="Andorra">Andorra</option>
                      <option value="Angola">Angola</option>
                      <option value="Antigua and Barbuda">Antigua and Barbuda</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Armenia">Armenia</option>
                      <option value="Australia">Australia</option>
                      <option value="Austria">Austria</option>
                      <option value="Azerbaijan">Azerbaijan</option>
                      <option value="Bahamas">Bahamas</option>
                      <option value="Bahrain">Bahrain</option>
                      <option value="Barbados">Barbados</option>
                      <option value="Belarus">Belarus</option>
                      <option value="Belgium">Belgium</option>
                      <option value="Belize">Belize</option>
                      <option value="Benin">Benin</option>
                      <option value="Bhutan">Bhutan</option>
                      <option value="Bolivia">Bolivia</option>
                      <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                      <option value="Botswana">Botswana</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Brunei">Brunei</option>
                      <option value="Bulgaria">Bulgaria</option>
                      <option value="Burkina Faso">Burkina Faso</option>
                      <option value="Burundi">Burundi</option>
                      <option value="Cabo Verde">Cabo Verde</option>
                      <option value="Cambodia">Cambodia</option>
                      <option value="Cameroon">Cameroon</option>
                      <option value="Canada">Canada</option>
                      <option value="Central African Republic">Central African Republic</option>
                      <option value="Chad">Chad</option>
                      <option value="Chile">Chile</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Comoros">Comoros</option>
                      <option value="Congo (Democratic Republic)">Congo (Democratic Republic)</option>
                      <option value="Congo (Republic)">Congo (Republic)</option>
                      <option value="Costa Rica">Costa Rica</option>
                      <option value="Croatia">Croatia</option>
                      <option value="Cuba">Cuba</option>
                      <option value="Cyprus">Cyprus</option>
                      <option value="Czech Republic">Czech Republic</option>
                      <option value="Denmark">Denmark</option>
                      <option value="Djibouti">Djibouti</option>
                      <option value="Dominica">Dominica</option>
                      <option value="Dominican Republic">Dominican Republic</option>
                      <option value="Ecuador">Ecuador</option>
                      <option value="Egypt">Egypt</option>
                      <option value="El Salvador">El Salvador</option>
                      <option value="Equatorial Guinea">Equatorial Guinea</option>
                      <option value="Eritrea">Eritrea</option>
                      <option value="Estonia">Estonia</option>
                      <option value="Eswatini">Eswatini</option>
                      <option value="Ethiopia">Ethiopia</option>
                      <option value="Fiji">Fiji</option>
                      <option value="Finland">Finland</option>
                      <option value="France">France</option>
                      <option value="Gabon">Gabon</option>
                      <option value="Gambia">Gambia</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Greece">Greece</option>
                      <option value="Grenada">Grenada</option>
                      <option value="Guatemala">Guatemala</option>
                      <option value="Guinea">Guinea</option>
                      <option value="Guinea-Bissau">Guinea-Bissau</option>
                      <option value="Guyana">Guyana</option>
                      <option value="Haiti">Haiti</option>
                      <option value="Honduras">Honduras</option>
                      <option value="Hungary">Hungary</option>
                      <option value="Iceland">Iceland</option>
                      <option value="Iran">Iran</option>
                      <option value="Iraq">Iraq</option>
                      <option value="Ireland">Ireland</option>
                      <option value="Israel">Israel</option>
                      <option value="Italy">Italy</option>
                      <option value="Ivory Coast">Ivory Coast</option>
                      <option value="Jamaica">Jamaica</option>
                      <option value="Jordan">Jordan</option>
                      <option value="Kazakhstan">Kazakhstan</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Kiribati">Kiribati</option>
                      <option value="Kuwait">Kuwait</option>
                      <option value="Kyrgyzstan">Kyrgyzstan</option>
                      <option value="Laos">Laos</option>
                      <option value="Latvia">Latvia</option>
                      <option value="Lebanon">Lebanon</option>
                      <option value="Lesotho">Lesotho</option>
                      <option value="Liberia">Liberia</option>
                      <option value="Libya">Libya</option>
                      <option value="Liechtenstein">Liechtenstein</option>
                      <option value="Lithuania">Lithuania</option>
                      <option value="Luxembourg">Luxembourg</option>
                      <option value="Madagascar">Madagascar</option>
                      <option value="Malawi">Malawi</option>
                      <option value="Maldives">Maldives</option>
                      <option value="Mali">Mali</option>
                      <option value="Malta">Malta</option>
                      <option value="Marshall Islands">Marshall Islands</option>
                      <option value="Mauritania">Mauritania</option>
                      <option value="Mauritius">Mauritius</option>
                      <option value="Micronesia">Micronesia</option>
                      <option value="Moldova">Moldova</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Mongolia">Mongolia</option>
                      <option value="Montenegro">Montenegro</option>
                      <option value="Morocco">Morocco</option>
                      <option value="Mozambique">Mozambique</option>
                      <option value="Myanmar">Myanmar</option>
                      <option value="Namibia">Namibia</option>
                      <option value="Nauru">Nauru</option>
                      <option value="Nepal">Nepal</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="New Zealand">New Zealand</option>
                      <option value="Nicaragua">Nicaragua</option>
                      <option value="Niger">Niger</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="North Korea">North Korea</option>
                      <option value="North Macedonia">North Macedonia</option>
                      <option value="Norway">Norway</option>
                      <option value="Oman">Oman</option>
                      <option value="Palau">Palau</option>
                      <option value="Panama">Panama</option>
                      <option value="Papua New Guinea">Papua New Guinea</option>
                      <option value="Paraguay">Paraguay</option>
                      <option value="Peru">Peru</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Poland">Poland</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Qatar">Qatar</option>
                      <option value="Romania">Romania</option>
                      <option value="Russia">Russia</option>
                      <option value="Rwanda">Rwanda</option>
                      <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                      <option value="Saint Lucia">Saint Lucia</option>
                      <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
                      <option value="Samoa">Samoa</option>
                      <option value="San Marino">San Marino</option>
                      <option value="Sao Tome and Principe">Sao Tome and Principe</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Senegal">Senegal</option>
                      <option value="Serbia">Serbia</option>
                      <option value="Seychelles">Seychelles</option>
                      <option value="Sierra Leone">Sierra Leone</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Slovakia">Slovakia</option>
                      <option value="Slovenia">Slovenia</option>
                      <option value="Solomon Islands">Solomon Islands</option>
                      <option value="Somalia">Somalia</option>
                      <option value="South Africa">South Africa</option>
                      <option value="South Sudan">South Sudan</option>
                      <option value="Spain">Spain</option>
                      <option value="Sri Lanka">Sri Lanka</option>
                      <option value="Sudan">Sudan</option>
                      <option value="Suriname">Suriname</option>
                      <option value="Sweden">Sweden</option>
                      <option value="Switzerland">Switzerland</option>
                      <option value="Syria">Syria</option>
                      <option value="Tajikistan">Tajikistan</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Timor-Leste">Timor-Leste</option>
                      <option value="Togo">Togo</option>
                      <option value="Tonga">Tonga</option>
                      <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                      <option value="Tunisia">Tunisia</option>
                      <option value="Turkmenistan">Turkmenistan</option>
                      <option value="Tuvalu">Tuvalu</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Ukraine">Ukraine</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Uruguay">Uruguay</option>
                      <option value="Uzbekistan">Uzbekistan</option>
                      <option value="Vanuatu">Vanuatu</option>
                      <option value="Vatican City">Vatican City</option>
                      <option value="Venezuela">Venezuela</option>
                      <option value="Yemen">Yemen</option>
                      <option value="Zambia">Zambia</option>
                      <option value="Zimbabwe">Zimbabwe</option>
                    </optgroup>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{categoryLabels[c]}</option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Sale Price *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    required min="0.01" step="0.01"
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 65.99"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Your Cost <span className="text-stone-600 normal-case font-normal">— supplier price, admin only</span></label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    min="0" step="0.01"
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 42.00"
                  />
                  {form.cost && form.price && parseFloat(form.cost) > 0 && parseFloat(form.price) > 0 && (
                    <p className="label-tactical text-stone-600 mt-1">
                      Margin: ${(parseFloat(form.price) - parseFloat(form.cost)).toFixed(2)} ({Math.round((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price) * 100)}%)
                    </p>
                  )}
                </div>

                {/* Weight */}
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Weight (lbs)</label>
                  <input
                    type="number"
                    value={form.weight_lbs}
                    onChange={e => setForm(f => ({ ...f, weight_lbs: e.target.value }))}
                    min="0"
                    step="0.01"
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 1.5"
                  />
                  {form.weight_lbs && parseFloat(form.weight_lbs) > 0 && (
                    <p className="label-tactical text-stone-600 mt-1">
                      = {(parseFloat(form.weight_lbs) * 16).toFixed(1)} oz
                    </p>
                  )}
                </div>

                {/* Dimensions */}
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Dimensions</label>
                  <input
                    type="text"
                    value={form.size}
                    onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 10 x 5 x 3 in"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="label-tactical text-stone-500 mb-1 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 resize-none"
                    placeholder="Brief product description..."
                  />
                </div>

                {/* ── Images ── */}
                <div className="sm:col-span-2">
                  {/* Hidden file input — shared across all image rows */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="flex items-center justify-between mb-2">
                    <label className="label-tactical text-stone-500">Product Images</label>
                    <button
                      type="button"
                      onClick={addImage}
                      className="label-tactical text-orange-500 hover:text-orange-400 text-xs border border-orange-500/30 hover:border-orange-500/60 px-3 py-1 rounded transition-colors"
                    >
                      + Add Image
                    </button>
                  </div>
                  {/* Image fit toggle */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="label-tactical text-stone-600 text-xs">Image Fit:</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_fit: 'cover' }))}
                      className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider border transition-all ${form.image_fit === 'cover' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}
                    >
                      Cover
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_fit: 'contain' }))}
                      className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider border transition-all ${form.image_fit === 'contain' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}
                    >
                      Contain
                    </button>
                    <span className="label-tactical text-stone-700 text-xs normal-case font-normal">
                      {form.image_fit === 'contain' ? '— zoom out, white background' : '— crop to fill frame'}
                    </span>
                  </div>
                  {form.images.length === 0 && (
                    <p className="label-tactical text-stone-700 text-xs">No images added yet.</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {form.images.map((url, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => { dragIndexRef.current = idx; }}
                        onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                        onDrop={e => { e.preventDefault(); if (dragIndexRef.current != null) moveImage(dragIndexRef.current, idx); setDragOverIdx(null); }}
                        onDragEnd={() => { dragIndexRef.current = null; setDragOverIdx(null); }}
                        className={`flex items-center gap-2 rounded transition-colors ${dragOverIdx === idx ? 'bg-orange-500/10 outline outline-1 outline-orange-500/40' : ''}`}
                      >
                        {/* Drag handle */}
                        <span
                          className="text-stone-600 hover:text-stone-400 cursor-grab active:cursor-grabbing select-none shrink-0 px-1 text-lg leading-none"
                          title="Drag to reorder"
                        >⠿</span>
                        <div className="w-10 h-10 rounded border border-stone-700 overflow-hidden shrink-0 bg-stone-800 flex items-center justify-center">
                          {url ? (
                            <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <span className="text-stone-700 text-xs">?</span>
                          )}
                        </div>
                        <input
                          type="url"
                          value={url}
                          onChange={e => updateImage(idx, e.target.value)}
                          placeholder={`Image URL ${idx + 1} (https://...)`}
                          className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleUploadClick(idx)}
                          disabled={uploadingIdx === idx}
                          title="Upload an image file"
                          className="shrink-0 px-3 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-300 text-xs font-semibold rounded transition-colors"
                        >
                          {uploadingIdx === idx ? '...' : '↑'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="text-stone-600 hover:text-red-400 transition-colors px-2 py-2 rounded shrink-0"
                          aria-label="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Colors (only for products without size variants) ── */}
                {form.sizes.length === 0 && (
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="label-tactical text-stone-500">Color Options</label>
                      <p className="label-tactical text-stone-700 text-xs mt-0.5 normal-case font-normal">Add size variants below to set colors per size instead.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addColor}
                      className="label-tactical text-orange-500 hover:text-orange-400 text-xs border border-orange-500/30 hover:border-orange-500/60 px-3 py-1 rounded transition-colors"
                    >
                      + Add Color
                    </button>
                  </div>
                  {form.colors.length === 0 && (
                    <p className="label-tactical text-stone-700 text-xs">No color options added yet.</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {form.colors.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={color.hex}
                          onChange={e => updateColor(idx, 'hex', e.target.value)}
                          className="w-10 h-10 rounded border border-stone-700 bg-stone-800 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={color.name}
                          onChange={e => updateColor(idx, 'name', e.target.value)}
                          placeholder="Color name (e.g. Black, Olive Drab)"
                          className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 text-sm"
                        />
                        <div className="relative w-24 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                          <input
                            type="number"
                            value={color.price}
                            onChange={e => updateColor(idx, 'price', e.target.value)}
                            step="0.01"
                            placeholder="0.00"
                            title="Absolute price for this color (leave blank to use base price)"
                            className="w-full bg-stone-800 border border-stone-700 rounded pl-6 pr-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0" onClick={() => toggleColorInStock(idx)}>
                          <div className={`w-7 h-4 rounded-full transition-colors relative ${color.in_stock !== false ? 'bg-green-600' : 'bg-stone-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${color.in_stock !== false ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                          </div>
                          <span className={`label-tactical text-xs ${color.in_stock !== false ? 'text-green-500' : 'text-stone-600'}`}>
                            {color.in_stock !== false ? 'In Stock' : 'Out'}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeColor(idx)}
                          className="text-stone-600 hover:text-red-400 transition-colors px-2 py-2 rounded shrink-0"
                          aria-label="Remove color"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* ── Sizes / Variants ── */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="label-tactical text-stone-500">Size Variants</label>
                      <p className="label-tactical text-stone-700 text-xs mt-0.5 normal-case font-normal">Each size can have its own weight and dimensions. Leave blank to inherit the product defaults above.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addSize}
                      className="label-tactical text-orange-500 hover:text-orange-400 text-xs border border-orange-500/30 hover:border-orange-500/60 px-3 py-1 rounded transition-colors shrink-0"
                    >
                      + Add Size
                    </button>
                  </div>
                  {form.sizes.length === 0 && (
                    <p className="label-tactical text-stone-700 text-xs">No size variants added. Products with one size leave this empty.</p>
                  )}
                  <div className="flex flex-col gap-3">
                    {form.sizes.map((sv, idx) => (
                      <div key={idx} className="bg-stone-950/60 border border-stone-700 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="label-tactical text-orange-500/70 text-xs">
                            {sv.label ? `Variant: ${sv.label}` : `Variant ${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => toggleSizeInStock(idx)}>
                              <div className={`w-7 h-4 rounded-full transition-colors relative ${sv.in_stock !== false ? 'bg-green-600' : 'bg-stone-700'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${sv.in_stock !== false ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                              </div>
                              <span className={`label-tactical text-xs ${sv.in_stock !== false ? 'text-green-500' : 'text-stone-600'}`}>
                                {sv.in_stock !== false ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeSize(idx)}
                              className="text-stone-600 hover:text-red-400 transition-colors text-xs"
                              aria-label="Remove variant"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Label */}
                          <div>
                            <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.65rem' }}>SIZE LABEL *</label>
                            <input
                              type="text"
                              value={sv.label}
                              onChange={e => updateSize(idx, 'label', e.target.value)}
                              placeholder="e.g. Regular, Large, Junior"
                              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          {/* Price */}
                          <div>
                            <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.65rem' }}>PRICE ($) <span className="text-stone-700 normal-case font-normal">— overrides base price</span></label>
                            <input
                              type="number"
                              value={sv.price}
                              onChange={e => updateSize(idx, 'price', e.target.value)}
                              min="0" step="0.01"
                              placeholder="e.g. 89.99"
                              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          {/* Weight */}
                          <div>
                            <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.65rem' }}>WEIGHT (lbs)</label>
                            <input
                              type="number"
                              value={sv.weight_lbs}
                              onChange={e => updateSize(idx, 'weight_lbs', e.target.value)}
                              min="0"
                              step="0.01"
                              placeholder="e.g. 1.5"
                              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                            />
                            {sv.weight_lbs && parseFloat(sv.weight_lbs) > 0 && (
                              <p className="label-tactical text-stone-600 mt-0.5" style={{ fontSize: '0.6rem' }}>
                                = {(parseFloat(sv.weight_lbs) * 16).toFixed(1)} oz
                              </p>
                            )}
                          </div>
                          {/* Dimensions */}
                          <div>
                            <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.65rem' }}>DIMENSIONS</label>
                            <input
                              type="text"
                              value={sv.dimensions}
                              onChange={e => updateSize(idx, 'dimensions', e.target.value)}
                              placeholder="e.g. 28 x 14 x 10 in"
                              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          {/* Notes */}
                          <div className="col-span-2">
                            <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.65rem' }}>NOTES <span className="text-stone-700 normal-case font-normal">— optional, shown to customer</span></label>
                            <input
                              type="text"
                              value={sv.notes}
                              onChange={e => updateSize(idx, 'notes', e.target.value)}
                              placeholder="e.g. Best for 72hr kits, Fits carry-on requirements"
                              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        {/* Per-size colors */}
                        <div className="mt-3 pt-3 border-t border-stone-800">
                          <div className="flex items-center justify-between mb-2">
                            <label className="label-tactical text-stone-600 text-xs">COLORS FOR THIS SIZE</label>
                            <button
                              type="button"
                              onClick={() => addSizeColor(idx)}
                              className="label-tactical text-orange-500/70 hover:text-orange-400 text-xs border border-orange-500/20 hover:border-orange-500/50 px-2 py-0.5 rounded transition-colors"
                            >
                              + Add Color
                            </button>
                          </div>
                          {(sv.colors || []).length === 0 && (
                            <p className="label-tactical text-stone-700 text-xs">No colors for this size yet.</p>
                          )}
                          <div className="flex flex-col gap-2">
                            {(sv.colors || []).map((c, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={c.hex}
                                  onChange={e => updateSizeColor(idx, cIdx, 'hex', e.target.value)}
                                  className="w-8 h-8 rounded border border-stone-700 bg-stone-800 cursor-pointer shrink-0"
                                />
                                <input
                                  type="text"
                                  value={c.name}
                                  onChange={e => updateSizeColor(idx, cIdx, 'name', e.target.value)}
                                  placeholder="Color name"
                                  className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                                />
                                <div className="relative w-20 shrink-0">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 text-xs">$</span>
                                  <input
                                    type="number"
                                    value={c.price}
                                    onChange={e => updateSizeColor(idx, cIdx, 'price', e.target.value)}
                                    step="0.01"
                                    placeholder="0.00"
                                    title="Absolute price for this color (leave blank to inherit size price)"
                                    className="w-full bg-stone-800 border border-stone-700 rounded pl-5 pr-2 py-1.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                                  />
                                </div>
                                <label className="flex items-center gap-1 cursor-pointer select-none shrink-0" onClick={() => toggleSizeColorInStock(idx, cIdx)}>
                                  <div className={`w-6 h-3.5 rounded-full transition-colors relative ${c.in_stock !== false ? 'bg-green-600' : 'bg-stone-700'}`}>
                                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${c.in_stock !== false ? 'translate-x-2.5' : 'translate-x-0.5'}`} />
                                  </div>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeSizeColor(idx, cIdx)}
                                  className="text-stone-600 hover:text-red-400 transition-colors text-xs shrink-0"
                                >✕</button>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Variant Groups ── */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="label-tactical text-stone-500">Variant Groups</label>
                      <p className="label-tactical text-stone-700 text-xs mt-0.5 normal-case font-normal">Additional options that modify the price (e.g. Temperature Rating, Insulation Type).</p>
                    </div>
                    <button
                      type="button"
                      onClick={addVariantGroup}
                      className="label-tactical text-orange-500 hover:text-orange-400 text-xs border border-orange-500/30 hover:border-orange-500/60 px-3 py-1 rounded transition-colors shrink-0"
                    >
                      + Add Group
                    </button>
                  </div>
                  {form.variant_groups.length === 0 && (
                    <p className="label-tactical text-stone-700 text-xs">No variant groups. Use these for options like temperature rating that affect price.</p>
                  )}
                  <div className="flex flex-col gap-3">
                    {form.variant_groups.map((vg, gIdx) => (
                      <div key={gIdx} className="bg-stone-950/60 border border-stone-700 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            type="text"
                            value={vg.name}
                            onChange={e => updateVariantGroupName(gIdx, e.target.value)}
                            placeholder="Group name, e.g. Temperature Rating"
                            className="bg-transparent border-b border-stone-700 focus:border-orange-500 outline-none text-white text-sm font-semibold uppercase tracking-wider placeholder-stone-700 flex-1 pb-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariantGroup(gIdx)}
                            className="text-stone-600 hover:text-red-400 transition-colors text-xs ml-4 shrink-0"
                          >
                            ✕ Remove Group
                          </button>
                        </div>
                        <div className="flex flex-col gap-2 mb-3">
                          {vg.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt.label}
                                onChange={e => updateVariantOption(gIdx, oIdx, 'label', e.target.value)}
                                placeholder="Option label, e.g. 0°F"
                                className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                              />
                              <div className="relative w-32 shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                                <input
                                  type="number"
                                  value={opt.price_modifier}
                                  onChange={e => updateVariantOption(gIdx, oIdx, 'price_modifier', e.target.value)}
                                  step="0.01"
                                  placeholder="0.00"
                                  className="w-full bg-stone-800 border border-stone-700 rounded pl-6 pr-3 py-2 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <span className="label-tactical text-stone-600 text-xs shrink-0">modifier</span>
                              <button
                                type="button"
                                onClick={() => removeVariantOption(gIdx, oIdx)}
                                className="text-stone-600 hover:text-red-400 transition-colors text-xs shrink-0"
                              >✕</button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addVariantOption(gIdx)}
                          className="label-tactical text-stone-500 hover:text-orange-400 text-xs border border-stone-700 hover:border-orange-500/60 px-3 py-1 rounded transition-colors"
                        >
                          + Add Option
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In Stock */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="in_stock"
                    checked={form.in_stock}
                    onChange={e => setForm(f => ({ ...f, in_stock: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <label htmlFor="in_stock" className="label-tactical text-stone-400">In Stock</label>
                </div>

                {/* Requires Sizing */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="requires_sizing"
                    checked={form.requires_sizing || false}
                    onChange={e => setForm(f => ({ ...f, requires_sizing: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <label htmlFor="requires_sizing" className="label-tactical text-stone-400">
                    Requires per-person sizing
                    <span className="text-stone-600 normal-case font-normal ml-1">(shirt, pants, boots, etc.)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_visible"
                    checked={form.is_visible !== false}
                    onChange={e => setForm(f => ({ ...f, is_visible: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <label htmlFor="is_visible" className="label-tactical text-stone-400">
                    Visible to public
                    <span className="text-stone-600 normal-case font-normal ml-1">(uncheck to hide from product listings)</span>
                  </label>
                </div>
              </div>

              {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Products Table */}
        {(() => {
          const uniqueBrands = [...new Set((products as any[]).map(p => p.brand).filter(Boolean))].sort() as string[];
          const filtered = (products as any[]).filter(p => {
            if (filterCategory && p.category !== filterCategory) return false;
            if (filterBrand && p.brand !== filterBrand) return false;
            if (filterSearch) {
              const query = filterSearch.toLowerCase();
              const searchable = [p.name, p.brand, p.category, p.description].filter(Boolean);
              if (!searchable.some(value => value.toLowerCase().includes(query))) return false;
            }
            return true;
          });
          const isFiltered = filterCategory || filterBrand || filterSearch;
          return (
            <>
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Search name, brand, category, or description..."
                  aria-label="Search products"
                  className="bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 text-sm w-48"
                />
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500 text-stone-300"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{categoryLabels[c] || c}</option>
                  ))}
                </select>
                <select
                  value={filterBrand}
                  onChange={e => setFilterBrand(e.target.value)}
                  className="bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500 text-stone-300"
                >
                  <option value="">All Brands</option>
                  {uniqueBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {isFiltered && (
                  <button
                    onClick={() => { setFilterSearch(''); setFilterCategory(''); setFilterBrand(''); }}
                    className="label-tactical text-stone-500 hover:text-orange-400 transition-colors text-xs border border-stone-700 hover:border-orange-500/50 px-3 py-1.5 rounded"
                  >
                    Clear
                  </button>
                )}
                <span className="label-tactical text-stone-600 ml-auto">
                  {isFiltered ? `${filtered.length} of ${(products as any[]).length}` : `${(products as any[]).length}`} products
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {filtered.map(product => (
            <div
              key={product.id}
              className={`bg-stone-900/80 border rounded p-4 flex items-center justify-between gap-4 transition-colors ${
                editingId === product.id ? 'border-orange-500/50' : 'border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Cover image thumbnail */}
                {product.images?.[0] && (
                  <div className="w-12 h-12 rounded border border-stone-700 overflow-hidden shrink-0 bg-stone-800">
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold uppercase tracking-wide truncate">{product.name}</span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="label-tactical text-stone-600">{categoryLabels[product.category] || product.category}</span>
                    {product.brand && <span className="label-tactical text-orange-500/60">{product.brand}</span>}
                    <span className="label-tactical text-stone-600">{formatPrice(product.price_cents)}</span>
                    {product.cost_cents > 0 && (
                      <span className="label-tactical text-stone-600">
                        cost {formatPrice(product.cost_cents)} · margin {Math.round((product.price_cents - product.cost_cents) / product.price_cents * 100)}%
                      </span>
                    )}
                    {product.weight_grams && <span className="label-tactical text-stone-600">{product.weight_grams}g</span>}
                    {product.colors?.length > 0 && (
                      <div className="flex items-center gap-1">
                        {product.colors.map((c, i) => (
                          <span key={i} className="w-3 h-3 rounded-full border border-stone-600 shrink-0" style={{ backgroundColor: c.hex }} title={c.name} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={product.is_visible !== false}
                  aria-label={`${product.is_visible === false ? 'Show' : 'Hide'} ${product.name} on the public Products page`}
                  onClick={() => toggleProductVisibility(product)}
                  disabled={visibilityUpdatingId === product.id}
                  className={`label-tactical tracking-widest border px-3 py-1 rounded transition-colors disabled:opacity-50 ${
                    product.is_visible !== false
                      ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                      : 'text-stone-400 border-stone-700 bg-stone-800/60 hover:text-green-400 hover:border-green-500/30'
                  }`}
                >
                  {visibilityUpdatingId === product.id ? 'Saving...' : product.is_visible !== false ? 'Visible' : 'Hidden'}
                </button>
                <span className={`label-tactical ${product.in_stock ? 'text-green-500' : 'text-stone-600'}`}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
                {product.link && (
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-tactical text-stone-500 hover:text-orange-400 transition-colors tracking-widest border border-stone-700 hover:border-orange-500/50 px-3 py-1 rounded"
                    title="Open supplier link"
                  >
                    ↗
                  </a>
                )}
                <button
                  onClick={() => openEditForm(product)}
                  className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest border border-stone-700 hover:border-stone-500 px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => openDuplicateForm(product)}
                  className="label-tactical text-stone-500 hover:text-sky-400 transition-colors tracking-widest border border-stone-700 hover:border-sky-500/50 px-3 py-1 rounded"
                  title="Duplicate product"
                >
                  Dupe
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="label-tactical text-stone-600 hover:text-red-400 transition-colors tracking-widest border border-stone-800 hover:border-red-500/50 px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
                  <div className="text-center py-16">
                    <p className="label-tactical text-stone-500">
                      {(products as any[]).length === 0 ? 'No products yet. Add the first one above.' : 'No products match the current filters.'}
                    </p>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </main>
  );
}
