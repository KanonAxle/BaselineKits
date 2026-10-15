// @ts-nocheck
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getAdminToken,
  getKits,
  adminGetProducts,
  adminCreateKit,
  adminUpdateKit,
  adminDeleteKit,
  adminGetKitCollections,
  adminCreateKitCollection,
  adminUpdateKitCollection,
  adminDeleteKitCollection,
  adminUploadImage,
} from '../../../lib/api';

type KitItem = {
  type: 'product' | 'kit';
  product_id?: string;
  sub_kit_id?: string;
  name: string;
  price_cents: number;
  quantity: number;
  item_count?: number;
  selected_variants?: Record<string, string>;
  is_person_slot?: boolean;
  qty_rule?: string | null;
};

function itemKey(item: KitItem) {
  if (item.type === 'kit') return `kit__${item.sub_kit_id || ''}`;
  const v = item.selected_variants || {};
  const vKey = Object.entries(v).sort().map(([k, val]) => `${k}=${val}`).join(',');
  return `${item.product_id || ''}__${vKey}`;
}

const emptyForm = {
  name: '',
  description: '',
  image_url: '',
  tag: '',
  collection_id: null as string | null,
  person_pack_gender: null as string | null,
  person_pack_age: null as string | null,
  items: [] as KitItem[],
};

export default function AdminKitsPage() {
  const router = useRouter();
  const [kits, setKits] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Product picker
  const [productSearch, setProductSearch] = useState('');
  const [addProductId, setAddProductId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [pendingColor, setPendingColor] = useState('');
  const [pendingSize, setPendingSize] = useState('');
  const [pendingVG, setPendingVG] = useState<Record<string, string>>({});

  // Sub-kit
  const [addSubKitId, setAddSubKitId] = useState('');
  const [addSubKitQty, setAddSubKitQty] = useState(1);

  // Item drag-to-reorder
  const [itemDraggingKey, setItemDraggingKey] = useState<string | null>(null);
  const [itemDragOverKey, setItemDragOverKey] = useState<string | null>(null);

  // Collections
  const [collections, setCollections] = useState<any[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [kitSearch, setKitSearch] = useState('');
  const [hiddenCollections, setHiddenCollections] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('hiddenKitCollections') || '[]'); } catch { return []; }
  });
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [renamingCollection, setRenamingCollection] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!getAdminToken()) { router.push('/admin'); return; }
    loadData();
  }, [router]);

  async function loadData() {
    try {
      const [kitsData, productsData] = await Promise.all([getKits(), adminGetProducts()]);
      setKits(kitsData);
      setProducts(productsData);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
    try { const c = await adminGetKitCollections(); setCollections(c); } catch {}
  }

  async function handleKitImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setFormError('');
    try {
      const imageUrl = await adminUploadImage(file);
      setForm(current => ({ ...current, image_url: imageUrl }));
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : 'Failed to upload kit image.');
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  }

  function resetAddProduct() {
    setAddProductId('');
    setAddQty(1);
    setPendingColor('');
    setPendingSize('');
    setPendingVG({});
  }

  function openNewForm() {
    setForm({ ...emptyForm, collection_id: activeCollection });
    setEditingId(null);
    setFormError('');
    setProductSearch('');
    resetAddProduct();
    setAddSubKitId('');
    setAddSubKitQty(1);
    setShowForm(true);
  }

  function openEditForm(kit: any) {
    setForm({
      name: kit.name || '',
      description: kit.description || '',
      image_url: kit.image_url || '',
      tag: kit.tag || '',
      collection_id: kit.collection_id || null,
      person_pack_gender: kit.person_pack_gender || null,
      person_pack_age: kit.person_pack_age || null,
      items: (kit.items || []).map((item: any) => ({
        type: item.type || 'product',
        product_id: item.product_id,
        sub_kit_id: item.sub_kit_id,
        name: item.name,
        price_cents: item.price_cents,
        quantity: item.quantity,
        item_count: item.item_count,
        selected_variants: item.selected_variants || undefined,
        is_person_slot: item.is_person_slot || false,
        qty_rule: item.qty_rule || null,
      })),
    });
    setEditingId(kit.id);
    setFormError('');
    setProductSearch('');
    resetAddProduct();
    setAddSubKitId('');
    setAddSubKitQty(1);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleProductSelect(id: string) {
    setAddProductId(prev => prev === id ? '' : id);
    setPendingColor('');
    setPendingSize('');
    setPendingVG({});
  }

  function handleSizeSelect(label: string) {
    setPendingSize(prev => prev === label ? '' : label);
    setPendingColor('');
  }

  function addProductToKit() {
    if (!addProductId) return;
    const product = products.find(p => p.id === addProductId);
    if (!product) return;

    const selected_variants: Record<string, string> = {};
    if (pendingSize) selected_variants.size = pendingSize;
    if (pendingColor) selected_variants.color = pendingColor;
    for (const [group, opt] of Object.entries(pendingVG)) {
      if (opt) selected_variants[group] = opt;
    }

    let priceCents = product.price_cents;
    if (pendingSize && Array.isArray(product.sizes)) {
      const sizeObj = product.sizes.find(s => (typeof s === 'string' ? s : s.label) === pendingSize);
      if (sizeObj?.price_cents) priceCents = sizeObj.price_cents;
    }
    if (pendingColor) {
      const colorsToCheck = (() => {
        if (pendingSize && Array.isArray(product.sizes)) {
          const sizeObj = product.sizes.find(s => (typeof s === 'string' ? s : s.label) === pendingSize);
          if (sizeObj?.colors?.length) return sizeObj.colors;
        }
        return product.colors || [];
      })();
      const colorObj = colorsToCheck.find(c => c.name === pendingColor);
      if (colorObj?.price_cents) priceCents = colorObj.price_cents;
    }

    const newItem: KitItem = {
      type: 'product',
      product_id: product.id,
      name: product.name,
      price_cents: priceCents,
      quantity: addQty,
      selected_variants: Object.keys(selected_variants).length > 0 ? selected_variants : undefined,
      qty_rule: null,
    };

    const newKey = itemKey(newItem);
    if (form.items.some(i => itemKey(i) === newKey)) return;

    setForm(f => ({ ...f, items: [...f.items, newItem] }));
    resetAddProduct();
  }

  function addSubKitToKit() {
    if (!addSubKitId) return;
    const kit = kits.find(k => k.id === addSubKitId);
    if (!kit) return;
    setForm(f => ({
      ...f,
      items: [...f.items, {
        type: 'kit',
        sub_kit_id: kit.id,
        name: kit.name,
        price_cents: kit.total_price_cents || 0,
        quantity: addSubKitQty,
        item_count: kit.items?.length || 0,
        is_person_slot: false,
      }],
    }));
    setAddSubKitId('');
    setAddSubKitQty(1);
  }

  function updateItemQty(key: string, qty: number) {
    if (qty < 1) return;
    setForm(f => ({
      ...f,
      items: f.items.map(i => itemKey(i) === key ? { ...i, quantity: qty } : i),
    }));
  }

  function updateItemField(key: string, field: string, value: any) {
    setForm(f => ({
      ...f,
      items: f.items.map(i => itemKey(i) === key ? { ...i, [field]: value } : i),
    }));
  }

  function removeItem(key: string) {
    setForm(f => ({ ...f, items: f.items.filter(i => itemKey(i) !== key) }));
  }

  function handleItemDragStart(e: React.DragEvent, key: string) {
    setItemDraggingKey(key);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleItemDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (key !== itemDraggingKey) setItemDragOverKey(key);
  }

  function handleItemDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    if (!itemDraggingKey || itemDraggingKey === targetKey) {
      setItemDraggingKey(null); setItemDragOverKey(null); return;
    }
    setForm(f => {
      const items = [...f.items];
      const fromIdx = items.findIndex(i => itemKey(i) === itemDraggingKey);
      const toIdx = items.findIndex(i => itemKey(i) === targetKey);
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return { ...f, items };
    });
    setItemDraggingKey(null); setItemDragOverKey(null);
  }

  function handleItemDragEnd() {
    setItemDraggingKey(null); setItemDragOverKey(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Kit name is required.'); return; }
    if (!form.items.length) { setFormError('Add at least one product or sub-kit.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        tag: form.tag.trim().toUpperCase() || null,
        collection_id: form.collection_id || null,
        person_pack_gender: form.person_pack_gender || null,
        person_pack_age: form.person_pack_age || null,
        items: form.items.map(i => ({
          product_id: i.product_id || null,
          sub_kit_id: i.sub_kit_id || null,
          quantity: i.quantity,
          selected_variants: i.selected_variants || null,
          is_person_slot: i.is_person_slot || false,
          qty_rule: i.qty_rule || null,
        })),
      };
      if (editingId) {
        const updated = await adminUpdateKit(editingId, payload);
        setKits(prev => prev.map(k => k.id === editingId ? updated : k));
      } else {
        const created = await adminCreateKit(payload);
        setKits(prev => [created, ...prev]);
      }
      cancelForm();
    } catch (err) {
      setFormError(err.message || 'Failed to save kit.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate(kit: any) {
    try {
      const payload = {
        name: `Copy of ${kit.name}`,
        description: kit.description || null,
        image_url: kit.image_url || null,
        tag: kit.tag || null,
        collection_id: kit.collection_id || null,
        person_pack_gender: kit.person_pack_gender || null,
        person_pack_age: kit.person_pack_age || null,
        items: (kit.items || []).map((i: any) => ({
          product_id: i.product_id || null,
          sub_kit_id: i.sub_kit_id || null,
          quantity: i.quantity,
          selected_variants: i.selected_variants || null,
          is_person_slot: i.is_person_slot || false,
          qty_rule: i.qty_rule || null,
        })),
      };
      const created = await adminCreateKit(payload);
      setKits(prev => [created, ...prev]);
    } catch {
      alert('Failed to duplicate kit.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this kit? This cannot be undone.')) return;
    try {
      await adminDeleteKit(id);
      setKits(prev => prev.filter(k => k.id !== id));
    } catch {
      alert('Failed to delete kit.');
    }
  }

  async function handleCreateCollection() {
    if (!newCollectionName.trim()) return;
    try {
      const created = await adminCreateKitCollection({ name: newCollectionName.trim() });
      setCollections(prev => [...prev, created]);
      setNewCollectionName('');
      setCreatingCollection(false);
      setActiveCollection(created.id);
    } catch { alert('Failed to create collection.'); }
  }

  async function handleRenameSubmit(id: string) {
    if (!renameValue.trim()) return;
    try {
      const updated = await adminUpdateKitCollection(id, { name: renameValue.trim() });
      setCollections(prev => prev.map(c => c.id === id ? updated : c));
      setRenamingCollection(null);
    } catch { alert('Failed to rename collection.'); }
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm('Delete this collection? Kits inside will be unassigned.')) return;
    try {
      await adminDeleteKitCollection(id);
      setCollections(prev => prev.filter(c => c.id !== id));
      setKits(prev => prev.map(k => k.collection_id === id ? { ...k, collection_id: null } : k));
      if (activeCollection === id) setActiveCollection(null);
    } catch { alert('Failed to delete collection.'); }
  }

  function toggleHideCollection(id: string) {
    setHiddenCollections(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      localStorage.setItem('hiddenKitCollections', JSON.stringify(next));
      return next;
    });
  }

  function formatPrice(cents: number) {
    return '$' + (cents / 100).toFixed(2);
  }

  function variantLabel(v: Record<string, string> | undefined) {
    if (!v || !Object.keys(v).length) return '';
    return Object.values(v).join(' / ');
  }

  const kitTotal = form.items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

  const addedSubKitIds = new Set(form.items.filter(i => i.type === 'kit').map(i => i.sub_kit_id));
  const availableSubKits = (kits as any[]).filter(k => k.id !== editingId && !addedSubKitIds.has(k.id));

  const collectionKits = activeCollection === null
    ? kits.filter(k => !hiddenCollections.includes(k.collection_id))
    : kits.filter(k => k.collection_id === activeCollection);
  const searchQuery = kitSearch.trim().toLowerCase();
  const filteredKits = collectionKits.filter(kit => {
    if (!searchQuery) return true;
    const collectionName = collections.find(collection => collection.id === kit.collection_id)?.name || '';
    return [
      kit.name,
      kit.description,
      kit.tag,
      collectionName,
      ...(kit.items || []).map(item => item.name),
    ].some(value => value?.toLowerCase().includes(searchQuery));
  });

  // Filtered product list for picker
  const filteredProducts = products.filter(p => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  const selectedProduct = products.find(p => p.id === addProductId);
  const hasSizes = Array.isArray(selectedProduct?.sizes) && selectedProduct.sizes.length > 0;
  const hasVariantGroups = Array.isArray(selectedProduct?.variant_groups) && selectedProduct.variant_groups.length > 0;

  const colorsToShow = (() => {
    if (!selectedProduct) return [];
    if (pendingSize && hasSizes) {
      const sizeObj = selectedProduct.sizes.find(s => (typeof s === 'string' ? s : s.label) === pendingSize);
      if (sizeObj?.colors?.length) return sizeObj.colors;
    }
    return selectedProduct?.colors || [];
  })();

  const hasVariants = hasSizes || colorsToShow.length > 0 || hasVariantGroups;

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="label-tactical text-stone-500 tracking-widest">Loading kits...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">BaselineKits</Link>
          <span className="label-tactical text-stone-600">/ Kits</span>
        </div>
        <Link href="/admin" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">← Dashboard</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Kit Builder</p>
            <h1 className="text-3xl font-extrabold uppercase tracking-wide">Manage Kits</h1>
          </div>
          {!showForm && (
            <button onClick={openNewForm} className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors">
              + New Kit
            </button>
          )}
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {/* ── Form ── */}
        {showForm && (
          <div className="bg-stone-900/80 border border-orange-500/30 rounded p-6 mb-8">
            <p className="label-tactical text-orange-500 mb-6 tracking-[0.15em]">
              {editingId ? '// Edit Kit' : '// New Kit'}
            </p>
            <form onSubmit={handleSave}>

              {/* Kit metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Kit Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 72-Hour Bug Out Kit"
                  />
                </div>
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Tag <span className="text-stone-600 normal-case font-normal">— short ref shown in quiz routing</span></label>
                  <input
                    type="text"
                    value={form.tag}
                    onChange={e => setForm(f => ({ ...f, tag: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') }))}
                    maxLength={12}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="e.g. SOLO-72"
                    style={{ fontFamily: "'Courier New', Courier, monospace" }}
                  />
                </div>
                <div>
                  <label className="label-tactical text-stone-500 mb-1 block">Kit Image</label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif"
                    className="hidden"
                    onChange={handleKitImageUpload}
                  />
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    placeholder="https://..."
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={imageUploading}
                      className="label-tactical text-orange-500 hover:text-orange-400 disabled:opacity-50 text-xs border border-orange-500/30 hover:border-orange-500/60 px-3 py-2 rounded transition-colors"
                    >
                      {imageUploading ? 'Uploading image...' : 'Upload Image'}
                    </button>
                    {form.image_url && (
                      <img src={form.image_url} alt="Kit preview" className="w-12 h-12 object-cover rounded border border-stone-700" />
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="label-tactical text-stone-500 mb-1 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 resize-none"
                    placeholder="Describe this kit and its intended use..."
                  />
                </div>
                {collections.length > 0 && (
                  <div>
                    <label className="label-tactical text-stone-500 mb-1 block">Collection</label>
                    <select
                      value={form.collection_id || ''}
                      onChange={e => setForm(f => ({ ...f, collection_id: e.target.value || null }))}
                      className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">— No collection —</option>
                      {collections.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Person Pack ── */}
              <div className="border-t border-stone-800 pt-4 mb-6">
                <label className="flex items-center gap-3 cursor-pointer group mb-3">
                  <input
                    type="checkbox"
                    checked={!!(form.person_pack_gender || form.person_pack_age)}
                    onChange={e => {
                      if (!e.target.checked) {
                        setForm(f => ({ ...f, person_pack_gender: null, person_pack_age: null }));
                      } else {
                        setForm(f => ({ ...f, person_pack_gender: f.person_pack_gender || 'male', person_pack_age: f.person_pack_age || 'adult' }));
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="label-tactical text-stone-400 group-hover:text-white tracking-[0.15em] transition-colors">This kit is a Person Pack (gender/age-specific sub-kit)</span>
                </label>
                {(form.person_pack_gender || form.person_pack_age) && (
                  <div className="flex gap-4 ml-7">
                    <div>
                      <p className="label-tactical text-stone-600 mb-1" style={{ fontSize: '0.6rem' }}>GENDER</p>
                      <div className="flex gap-2">
                        {['male', 'female'].map(g => (
                          <button key={g} type="button"
                            onClick={() => setForm(f => ({ ...f, person_pack_gender: g }))}
                            className={`text-xs px-4 py-1.5 rounded border font-semibold uppercase tracking-wide transition-colors ${
                              form.person_pack_gender === g
                                ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                                : 'border-stone-700 text-stone-400 hover:border-stone-500'
                            }`}
                          >{g}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="label-tactical text-stone-600 mb-1" style={{ fontSize: '0.6rem' }}>AGE GROUP</p>
                      <div className="flex gap-2">
                        {['adult', 'child'].map(a => (
                          <button key={a} type="button"
                            onClick={() => setForm(f => ({ ...f, person_pack_age: a }))}
                            className={`text-xs px-4 py-1.5 rounded border font-semibold uppercase tracking-wide transition-colors ${
                              form.person_pack_age === a
                                ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                                : 'border-stone-700 text-stone-400 hover:border-stone-500'
                            }`}
                          >{a}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Kit Contents ── */}
              <div className="border-t border-stone-800 pt-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="label-tactical text-stone-500 tracking-[0.15em]">Kit Contents</label>
                  {kitTotal > 0 && (
                    <span className="label-tactical text-orange-400 tracking-widest">Total: {formatPrice(kitTotal)}</span>
                  )}
                </div>

                {/* Current items */}
                {form.items.length > 0 && (
                  <div className="flex flex-col gap-2 mb-6">
                    {form.items.map(item => (
                      <div
                        key={itemKey(item)}
                        draggable
                        onDragStart={e => handleItemDragStart(e, itemKey(item))}
                        onDragOver={e => handleItemDragOver(e, itemKey(item))}
                        onDrop={e => handleItemDrop(e, itemKey(item))}
                        onDragEnd={handleItemDragEnd}
                        className={`flex items-start gap-3 border rounded px-4 py-3 transition-all ${
                          itemDraggingKey === itemKey(item) ? 'opacity-30' : ''
                        } ${
                          itemDragOverKey === itemKey(item) && itemDraggingKey !== itemKey(item) ? 'ring-1 ring-orange-500/40' : ''
                        } ${
                          item.type === 'kit' ? 'bg-orange-500/5 border-orange-500/20' : 'bg-stone-800/60 border-stone-700/40'
                        }`}
                      >
                        <span className="text-stone-700 hover:text-stone-500 cursor-grab active:cursor-grabbing select-none shrink-0 text-base leading-none mt-1" title="Drag to reorder">⠿</span>
                        <span className={`label-tactical shrink-0 text-xs px-1.5 py-0.5 rounded border ${
                          item.type === 'kit'
                            ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                            : 'text-stone-500 border-stone-700 bg-stone-800'
                        }`}>
                          {item.type === 'kit' ? 'Kit' : 'Item'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-stone-500 text-xs">
                            {formatPrice(item.price_cents)} {item.type === 'kit' ? `(${item.item_count} items)` : 'each'}
                            {item.selected_variants && Object.keys(item.selected_variants).length > 0 && (
                              <span className="ml-1 text-orange-400/70">· {variantLabel(item.selected_variants)}</span>
                            )}
                          </p>
                          {/* Per-item controls */}
                          {item.type === 'product' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <select
                                value={item.qty_rule || ''}
                                onChange={e => updateItemField(itemKey(item), 'qty_rule', e.target.value || null)}
                                className="bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-xs text-stone-300 focus:outline-none focus:border-orange-500"
                              >
                                <option value="">Fixed qty</option>
                                <option value="per_person">× Per Person</option>
                                <option value="per_adult">× Per Adult</option>
                                <option value="per_child">× Per Child</option>
                                <option value="per_adult_male">× Per Adult (M)</option>
                                <option value="per_adult_female">× Per Adult (F)</option>
                                <option value="per_child_male">× Per Child (M)</option>
                                <option value="per_child_female">× Per Child (F)</option>
                              </select>
                              {item.qty_rule && (
                                <span className="label-tactical text-teal-400 border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 rounded text-xs">
                                  {item.qty_rule.replace(/_/g, '/')}
                                </span>
                              )}
                            </div>
                          )}
                          {item.type === 'kit' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() => updateItemField(itemKey(item), 'is_person_slot', !item.is_person_slot)}
                                className={`label-tactical text-xs px-2 py-0.5 rounded border transition-colors ${
                                  item.is_person_slot
                                    ? 'border-teal-500/60 text-teal-400 bg-teal-500/10'
                                    : 'border-stone-700 text-stone-600 hover:border-stone-600 hover:text-stone-400'
                                }`}
                              >
                                {item.is_person_slot ? '👤 Person Slot' : 'Person Slot'}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => updateItemQty(itemKey(item), item.quantity - 1)} disabled={item.quantity <= 1} className="w-7 h-7 rounded border border-stone-600 text-stone-400 hover:border-orange-500 hover:text-orange-400 disabled:opacity-30 transition-colors text-sm font-bold">−</button>
                          <span className="w-6 text-center text-white text-sm font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => updateItemQty(itemKey(item), item.quantity + 1)} className="w-7 h-7 rounded border border-stone-600 text-stone-400 hover:border-orange-500 hover:text-orange-400 transition-colors text-sm font-bold">+</button>
                        </div>
                        <p className="text-stone-300 text-sm font-semibold w-16 text-right">{formatPrice(item.price_cents * item.quantity)}</p>
                        <button type="button" onClick={() => removeItem(itemKey(item))} className="text-stone-600 hover:text-red-400 transition-colors text-xs font-bold ml-2 w-5 text-center">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Product Picker ── */}
                {products.length > 0 && (
                  <div className="mb-4">
                    <p className="label-tactical text-stone-600 mb-3" style={{ fontSize: '0.6rem' }}>ADD PRODUCT</p>

                    {/* Search */}
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search by name, brand, or category..."
                      className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-orange-500 mb-3"
                    />

                    {/* Product card grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                      {filteredProducts.map(p => {
                        const isSelected = addProductId === p.id;
                        const img = p.image_url || p.images?.[0];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProductSelect(p.id)}
                            className={`text-left rounded border transition-all flex flex-col overflow-hidden ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30'
                                : 'border-stone-700 bg-stone-800/60 hover:border-stone-500 hover:bg-stone-800'
                            }`}
                          >
                            {/* Image */}
                            <div className="w-full aspect-square bg-stone-900 overflow-hidden relative">
                              {img ? (
                                <img
                                  src={img}
                                  alt={p.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-700 text-xs">No image</div>
                              )}
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                              )}
                            </div>
                            {/* Info */}
                            <div className="p-2 flex-1">
                              {p.brand && (
                                <p className="text-orange-400/70 font-bold uppercase tracking-wide mb-0.5" style={{ fontSize: '0.55rem' }}>{p.brand}</p>
                              )}
                              <p className="text-white text-xs font-semibold leading-tight line-clamp-2 mb-1">{p.name}</p>
                              <p className="text-stone-400 font-bold" style={{ fontSize: '0.7rem' }}>{formatPrice(p.price_cents)}</p>
                            </div>
                          </button>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <p className="col-span-4 text-stone-600 text-sm py-4 text-center">No products match your search.</p>
                      )}
                    </div>

                    {/* Variant picker + Add — only shown when a product is selected */}
                    {selectedProduct && (
                      <div className="mt-4 pt-4 border-t border-stone-800 space-y-3">

                        {/* Sizes */}
                        {hasSizes && (
                          <div>
                            <p className="label-tactical text-stone-600 mb-2" style={{ fontSize: '0.6rem' }}>SIZE</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedProduct.sizes.map((s) => {
                                const label = typeof s === 'string' ? s : s.label;
                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleSizeSelect(label)}
                                    className={`text-xs px-3 py-1.5 rounded border font-semibold uppercase tracking-wide transition-colors ${
                                      pendingSize === label
                                        ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                                        : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-300'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Colors */}
                        {colorsToShow.length > 0 && (
                          <div>
                            <p className="label-tactical text-stone-600 mb-2" style={{ fontSize: '0.6rem' }}>COLOR</p>
                            <div className="flex flex-wrap gap-2 items-center">
                              {colorsToShow.map((c, ci) => (
                                <button
                                  key={`${c.name}-${ci}`}
                                  type="button"
                                  title={c.name}
                                  onClick={() => setPendingColor(prev => prev === c.name ? '' : c.name)}
                                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                                    pendingColor === c.name
                                      ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/20'
                                      : 'border-stone-600 hover:border-stone-400'
                                  }`}
                                  style={{ backgroundColor: c.hex || '#888' }}
                                />
                              ))}
                              {pendingColor && <span className="text-stone-400 text-xs ml-1">{pendingColor}</span>}
                            </div>
                          </div>
                        )}

                        {/* Custom variant groups */}
                        {hasVariantGroups && selectedProduct.variant_groups.map((group) => (
                          <div key={group.name}>
                            <p className="label-tactical text-stone-600 mb-2 uppercase" style={{ fontSize: '0.6rem' }}>{group.name}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(group.options || []).map((opt) => {
                                const label = typeof opt === 'string' ? opt : opt.label;
                                const isSelected = pendingVG[group.name] === label;
                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => setPendingVG(prev => ({ ...prev, [group.name]: isSelected ? '' : label }))}
                                    className={`text-xs px-3 py-1.5 rounded border font-semibold uppercase tracking-wide transition-colors ${
                                      isSelected
                                        ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                                        : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-300'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Qty + Add row */}
                        <div className="flex items-end gap-3 pt-1">
                          <div>
                            <p className="label-tactical text-stone-600 mb-1" style={{ fontSize: '0.6rem' }}>QTY</p>
                            <input
                              type="number"
                              value={addQty}
                              onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                              min="1"
                              className="w-20 bg-stone-800 border border-stone-700 rounded px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <div className="flex-1">
                            {(pendingSize || pendingColor || Object.values(pendingVG).some(Boolean)) && (
                              <p className="text-stone-500 text-xs mb-1">
                                <span className="text-orange-400">{[pendingSize, pendingColor, ...Object.values(pendingVG).filter(Boolean)].filter(Boolean).join(' / ')}</span>
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={addProductToKit}
                            className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded transition-colors"
                          >
                            Add to Kit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Add Sub-Kit ── */}
                {availableSubKits.length > 0 && (
                  <div className="border-t border-stone-800/60 pt-4 mt-2">
                    <p className="label-tactical text-stone-600 mb-2" style={{ fontSize: '0.6rem' }}>ADD SUB-KIT <span className="text-stone-700 normal-case font-normal">— import an entire kit as one item</span></p>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <select
                          value={addSubKitId}
                          onChange={e => setAddSubKitId(e.target.value)}
                          className="w-full bg-stone-800 border border-orange-500/20 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="">— Select a kit to embed —</option>
                          {availableSubKits.map(k => (
                            <option key={k.id} value={k.id}>
                              {k.name} — {formatPrice(k.total_price_cents || 0)} ({k.items?.length || 0} items)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.6rem' }}>Qty</label>
                        <input
                          type="number"
                          value={addSubKitQty}
                          onChange={e => setAddSubKitQty(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                          className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addSubKitToKit}
                        disabled={!addSubKitId}
                        className="bg-orange-600/70 hover:bg-orange-600 disabled:opacity-30 text-white text-xs font-bold uppercase tracking-widest px-5 py-3 rounded transition-colors"
                      >
                        Embed
                      </button>
                    </div>
                  </div>
                )}

                {products.length === 0 && availableSubKits.length === 0 && form.items.length === 0 && (
                  <p className="label-tactical text-stone-600 tracking-widest">No products in catalog yet.</p>
                )}
              </div>

              {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-8 py-3 rounded transition-colors">
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Kit'}
                </button>
                <button type="button" onClick={cancelForm} className="border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Collections Filter Bar ── */}
        {(collections.length > 0 || !showForm) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setActiveCollection(null)}
              className={`label-tactical text-xs px-3 py-1.5 rounded border transition-colors ${
                activeCollection === null
                  ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                  : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300'
              }`}
            >All</button>
            {collections.map(c => (
              <div key={c.id} className="flex items-center gap-1">
                {renamingCollection === c.id ? (
                  <form onSubmit={e => { e.preventDefault(); handleRenameSubmit(c.id); }} className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => setRenamingCollection(null)}
                      className="bg-stone-800 border border-orange-500/40 rounded px-2 py-1 text-xs text-white focus:outline-none w-28"
                    />
                    <button type="submit" className="label-tactical text-orange-400 text-xs px-2 py-1">✓</button>
                  </form>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveCollection(c.id)}
                      className={`label-tactical text-xs px-3 py-1.5 rounded border transition-colors ${
                        hiddenCollections.includes(c.id) ? 'opacity-40 border-stone-800 text-stone-600' :
                        activeCollection === c.id
                          ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                          : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300'
                      }`}
                    >{c.name}</button>
                    <button
                      onClick={() => toggleHideCollection(c.id)}
                      className="text-stone-700 hover:text-stone-400 transition-colors text-xs px-1"
                      title={hiddenCollections.includes(c.id) ? 'Show collection' : 'Hide from All view'}
                    >{hiddenCollections.includes(c.id) ? '🙈' : '👁'}</button>
                    <button onClick={() => { setRenamingCollection(c.id); setRenameValue(c.name); }} className="text-stone-700 hover:text-stone-400 text-xs transition-colors px-1">✎</button>
                    <button onClick={() => handleDeleteCollection(c.id)} className="text-stone-700 hover:text-red-400 text-xs transition-colors px-1">✕</button>
                  </>
                )}
              </div>
            ))}
            {creatingCollection ? (
              <form onSubmit={e => { e.preventDefault(); handleCreateCollection(); }} className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  onBlur={() => { if (!newCollectionName.trim()) setCreatingCollection(false); }}
                  placeholder="Collection name..."
                  className="bg-stone-800 border border-orange-500/40 rounded px-2 py-1 text-xs text-white focus:outline-none w-36 placeholder-stone-600"
                />
                <button type="submit" className="label-tactical text-orange-400 text-xs px-2 py-1">✓</button>
              </form>
            ) : (
              <button onClick={() => setCreatingCollection(true)} className="label-tactical text-stone-600 hover:text-stone-400 text-xs border border-dashed border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded transition-colors">
                + Collection
              </button>
            )}
          </div>
        )}

        {/* ── Kits List ── */}
        {!showForm && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <input
              type="search"
              value={kitSearch}
              onChange={event => setKitSearch(event.target.value)}
              placeholder="Search kits by name, tag, collection, or item..."
              aria-label="Search kits"
              className="w-full sm:max-w-md bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
            />
            {kitSearch && (
              <span className="label-tactical text-stone-600">
                {filteredKits.length} of {collectionKits.length} kits
              </span>
            )}
          </div>
        )}
        {filteredKits.length === 0 ? (
          <div className="bg-stone-900/60 border border-stone-800 rounded p-12 text-center">
            <p className="label-tactical text-stone-600 tracking-widest mb-3">
              {kitSearch ? 'No kits match your search' : activeCollection ? 'No kits in this collection' : 'No kits yet'}
            </p>
            <p className="text-stone-500 text-sm">
              {kitSearch ? 'Try another kit name, tag, collection, or item.' : activeCollection ? 'Create a kit and assign it to this collection.' : 'Create your first kit to get started.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredKits.map(kit => (
              <div key={kit.id} className="bg-stone-900/60 border border-stone-800 hover:border-stone-700 rounded p-5 flex items-start gap-4 transition-colors">
                {kit.image_url && (
                  <img src={kit.image_url} alt={kit.name} className="w-16 h-16 object-cover rounded border border-stone-700 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base uppercase tracking-wide">{kit.name}</h3>
                        {kit.tag && (
                          <span className="label-tactical px-1.5 py-0.5 rounded border border-stone-600 bg-stone-800 text-stone-300 text-xs" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                            {kit.tag}
                          </span>
                        )}
                      </div>
                      {kit.collection_id && collections.find(c => c.id === kit.collection_id) && (
                        <span className="inline-flex items-center mt-1 label-tactical text-stone-500 border border-stone-700 bg-stone-800/60 px-2 py-0.5 rounded text-xs">
                          {collections.find(c => c.id === kit.collection_id)?.name}
                        </span>
                      )}
                      {kit.person_pack_gender && (
                        <span className="inline-flex items-center gap-1 mt-1 label-tactical text-teal-400 border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 rounded text-xs">
                          👤 PERSON PACK · {kit.person_pack_gender} {kit.person_pack_age}
                        </span>
                      )}
                      {kit.description && <p className="text-stone-500 text-xs mt-0.5 line-clamp-1">{kit.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-orange-400 font-bold text-sm">{formatPrice(kit.total_price_cents)}</p>
                      <p className="text-stone-600 text-xs">{kit.items?.length || 0} item{kit.items?.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {kit.items?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {kit.items.map((item, i) => (
                        <span
                          key={`${item.product_id || item.sub_kit_id || 'item'}-${i}`}
                          className={`text-xs px-2 py-0.5 rounded border ${
                            item.type === 'kit'
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : 'bg-stone-800 border-stone-700 text-stone-400'
                          }`}
                        >
                          {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                          {item.selected_variants && Object.keys(item.selected_variants).length > 0 && (
                            <span className="text-stone-600 ml-1">({variantLabel(item.selected_variants)})</span>
                          )}
                          {item.type === 'kit' && ' 📦'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => openEditForm(kit)} className="border border-stone-700 hover:border-orange-500 text-stone-400 hover:text-orange-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors">Edit</button>
                  <button onClick={() => handleDuplicate(kit)} className="border border-stone-700 hover:border-stone-500 text-stone-500 hover:text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors">Dupe</button>
                  <button onClick={() => handleDelete(kit.id)} className="border border-stone-700 hover:border-red-500/60 text-stone-600 hover:text-red-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
