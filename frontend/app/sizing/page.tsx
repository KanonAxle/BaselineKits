// @ts-nocheck
'use client';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../lib/cartContext';
import { getKit } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────
type Person = {
  kind: 'adult' | 'child';
  gender: string;
  label: string;
};

// ── Helpers ───────────────────────────────────────────────────────
function matchesPersonAudience(item: any, person?: { kind: string; gender: string }): boolean {
  const name = (item.name || '').toLowerCase();
  const isForAdultWomen = /\b(?:women|womens|woman|female|ladies)\b/.test(name);
  const isForAdultMen = /\b(?:men|mens|man|male)\b/.test(name);
  const isForGirls = /\bgirls?\b/.test(name);
  const isForBoys = /\bboys?\b/.test(name);
  const isForChildren = /\b(?:kids?|children?|youth)\b/.test(name) || isForGirls || isForBoys;
  const isForAdults = /\badult\b/.test(name) || isForAdultWomen || isForAdultMen;
  const gender = person?.gender?.trim().toLowerCase();

  if (person?.kind === 'adult' && isForChildren) return false;
  if (person?.kind === 'child' && isForAdults) return false;
  if (gender === 'male' && (isForAdultWomen || isForGirls)) return false;
  if (gender === 'female' && (isForAdultMen || isForBoys)) return false;
  return true;
}

// Collect sizable items for a specific person, respecting person-slot filtering.
function collectSizableForPerson(items: any[], person?: { kind: string; gender: string }): any[] {
  const result: any[] = [];
  for (const item of items) {
    if (item.type === 'product' && item.requires_sizing) {
      if (matchesPersonAudience(item, person)) result.push(item);
    } else if (item.type === 'kit' && Array.isArray(item.items)) {
      const packGender = item.person_pack_gender?.trim().toLowerCase();
      const packAge = item.person_pack_age?.trim().toLowerCase();
      const isPersonSlot = item.is_person_slot || packGender || packAge;
      const genderMatch = !packGender || packGender === person?.gender?.trim().toLowerCase();
      const ageMatch = !packAge || packAge === person?.kind?.trim().toLowerCase();

      if (!isPersonSlot || (genderMatch && ageMatch)) {
        result.push(...collectSizableForPerson(item.items, person));
      }
    }
  }
  return result;
}

// Collect all unique sizable items across all packs (for the overview list).
function collectAllSizable(items: any[]): any[] {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of items) {
    if (item.type === 'product' && item.requires_sizing) {
      if (!seen.has(item.product_id)) { seen.add(item.product_id); result.push(item); }
    } else if (item.type === 'kit' && Array.isArray(item.items)) {
      for (const child of collectAllSizable(item.items)) {
        if (!seen.has(child.product_id)) { seen.add(child.product_id); result.push(child); }
      }
    }
  }
  return result;
}

function buildLabel(person: Person, idx: number, list: Person[]) {
  const sameKind = list.filter(p => p.kind === person.kind);
  const kindIdx = sameKind.indexOf(person) + 1;
  const kindLabel = person.kind === 'adult' ? 'Adult' : 'Child';
  const genderPart = person.gender ? ` — ${person.gender}` : '';
  return sameKind.length > 1 ? `${kindLabel} ${kindIdx}${genderPart}` : `${kindLabel}${genderPart}`;
}

function initPersonSizings(count: number) {
  return Array.from({ length: count }, () => ({}));
}

// ── Component ─────────────────────────────────────────────────────
function SizingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kitIndex = parseInt(searchParams.get('kitIndex') || '0', 10);
  const { items, updateKitSizing } = useCart();

  const [kitRawItems, setKitRawItems] = useState<any[]>([]);
  const [loadingKit, setLoadingKit] = useState(true);
  const [kitError, setKitError] = useState('');

  // Group list
  const [personList, setPersonList] = useState<Person[]>([]);
  // step: 'group' | 0..N (person index) | 'review'
  const [step, setStep] = useState<'group' | number | 'review'>('group');
  // sizings[personIndex][productId] = { size?, color? }
  const [sizings, setSizings] = useState<Array<Record<string, Record<string, string>>>>([]);

  // Kit cart item
  const cartItem = items[kitIndex];

  // Load kit data + pre-populate group from quiz result
  useEffect(() => {
    if (!cartItem || cartItem.type !== 'kit') {
      router.push('/cart');
      return;
    }

    async function load() {
      try {
        const kitData = await getKit(cartItem.id);
        setKitRawItems(kitData.items || []);
      } catch {
        setKitError('Failed to load kit details.');
      } finally {
        setLoadingKit(false);
      }
    }

    load();

    // Pre-populate group from quiz result
    try {
      const stored = localStorage.getItem('quizResult');
      if (stored) {
        const parsed = JSON.parse(stored);
        const gc = parsed.group_composition || [];
        if (gc.length > 0) {
          const adultCount = gc.filter(p => p.kind === 'adult').length;
          let adultIndex = 0;
          const list = gc.map((p, i) => ({
            kind: p.kind,
            gender: p.kind === 'adult'
              ? (p.gender || (adultCount === 2 ? (adultIndex++ === 0 ? 'male' : 'female') : 'male'))
              : (p.gender || ''),
            label: '',
          }));
          // Labels computed dynamically
          setPersonList(list);
          setSizings(initPersonSizings(list.length));
          return;
        }
      }
    } catch {}

    // Default: 1 adult
    setPersonList([{ kind: 'adult', gender: 'male', label: '' }]);
    setSizings([{}]);
  }, [cartItem, router]);

  // ── Group management ──────────────────────────────────────────
  function removePerson(idx: number) {
    if (personList.length <= 1) return;
    setPersonList(prev => prev.filter((_, i) => i !== idx));
    setSizings(prev => prev.filter((_, i) => i !== idx));
  }

  function setGender(idx: number, gender: string) {
    setPersonList(prev => prev.map((p, i) => i === idx ? { ...p, gender } : p));
  }

  // ── Sizing selection ─────────────────────────────────────────
  function setSize(personIdx: number, productId: string, size: string) {
    setSizings(prev => {
      const next = [...prev];
      next[personIdx] = { ...next[personIdx], [productId]: { ...next[personIdx][productId], size } };
      return next;
    });
  }

  function setColor(personIdx: number, productId: string, color: string) {
    setSizings(prev => {
      const next = [...prev];
      next[personIdx] = { ...next[personIdx], [productId]: { ...next[personIdx][productId], color } };
      return next;
    });
  }

  // ── Navigation ───────────────────────────────────────────────
  function startSizing() {
    if (personList.length === 0) return;
    if (personList.some(p => p.kind === 'child' && !p.gender)) return;
    setSizings(initPersonSizings(personList.length));
    setStep(0);
  }

  function nextStep() {
    if (typeof step === 'number') {
      if (step < personList.length - 1) setStep(step + 1);
      else setStep('review');
    }
  }

  function prevStep() {
    if (step === 'review') setStep(personList.length - 1);
    else if (typeof step === 'number' && step > 0) setStep(step - 1);
    else setStep('group');
  }

  function confirmSizing() {
    const personSizes = personList.map((person, idx) => ({
      label: buildLabel(person, idx, personList),
      gender: person.gender,
      sizes: sizings[idx] || {},
    }));
    updateKitSizing(kitIndex, personSizes);
    router.push('/cart');
  }

  function formatPrice(cents: number) {
    return '$' + (cents / 100).toFixed(2);
  }

  // If kit loaded and no items require sizing at all, auto-complete and return to cart
  const allSizableItems = collectAllSizable(kitRawItems);
  useEffect(() => {
    if (!loadingKit && allSizableItems.length === 0) {
      updateKitSizing(kitIndex, []);
      router.push('/cart');
    }
  }, [loadingKit, allSizableItems.length]);

  // ── Progress bar ─────────────────────────────────────────────
  const totalSteps = personList.length + 2; // group + N persons + review
  const currentStepNum = step === 'group' ? 0 : step === 'review' ? totalSteps - 1 : (step as number) + 1;

  // ── Render states ────────────────────────────────────────────
  if (loadingKit) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="label-tactical text-stone-500 tracking-widest">Loading kit details...</p>
      </main>
    );
  }

  if (kitError) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{kitError}</p>
          <Link href="/cart" className="text-orange-400 hover:text-orange-300 text-sm underline">← Back to Cart</Link>
        </div>
      </main>
    );
  }

  if (!loadingKit && allSizableItems.length === 0) {
    return null; // useEffect above handles redirect
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
        <Link href="/" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">BaselineKits</Link>
        <Link href="/cart" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">← Back to Cart</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= currentStepNum ? 'bg-orange-500' : 'bg-stone-800'}`}
            />
          ))}
        </div>

        {/* ── STEP: Group Setup ── */}
        {step === 'group' && (
          <div>
            <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Before You Check Out</p>
            <h1 className="text-3xl font-extrabold uppercase tracking-wide mb-2">Who Are We Sizing For?</h1>
            <p className="text-stone-500 text-sm mb-8">
              Your kit includes items that require per-person sizing. Confirm child genders, then we'll collect sizes for each person.
            </p>

            <div className="flex flex-col gap-3 mb-6">
              {personList.map((person, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded px-4 py-3">
                  <span className="text-stone-400 text-sm font-semibold w-16 shrink-0">
                    {person.kind === 'adult' ? 'Adult' : 'Child'}
                  </span>
                  {person.kind === 'child' ? (
                    <div className="flex gap-1.5 flex-1">
                      {['Male', 'Female'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(idx, g)}
                          className={`text-xs px-3 py-1.5 rounded border font-semibold uppercase tracking-wide transition-colors ${
                            person.gender === g
                              ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                              : 'border-stone-700 text-stone-500 hover:border-stone-500'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                      {!person.gender && (
                        <span className="text-xs text-red-400/70 self-center ml-1">Required</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-stone-500 text-xs uppercase tracking-wide flex-1">
                      {person.gender}
                    </span>
                  )}
                  {personList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePerson(idx)}
                      className="text-stone-600 hover:text-red-400 transition-colors text-xs font-bold w-5 text-center shrink-0"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-stone-900/60 border border-stone-800 rounded px-4 py-3 mb-8">
              <p className="label-tactical text-stone-600 mb-1" style={{ fontSize: '0.6rem' }}>ITEMS NEEDING SIZES</p>
              <div className="flex flex-wrap gap-1.5">
                {allSizableItems.map(item => (
                  <Link
                    key={item.product_id}
                    href={`/products/${item.product_id}`}
                    target="_blank"
                    className="text-xs px-2 py-0.5 rounded border border-stone-700 bg-stone-800 text-stone-400 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            <button
              onClick={startSizing}
              disabled={personList.some(p => p.kind === 'child' && !p.gender)}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest py-4 rounded transition-colors"
            >
              Get Started →
            </button>
          </div>
        )}

        {/* ── STEP: Per-Person Sizing ── */}
        {typeof step === 'number' && step < personList.length && (
          <div>
            <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">
              // Person {step + 1} of {personList.length}
            </p>
            <h1 className="text-3xl font-extrabold uppercase tracking-wide mb-1">
              {buildLabel(personList[step], step, personList)}
            </h1>
            <p className="text-stone-500 text-sm mb-8">Select sizes for each item below.</p>

            <div className="flex flex-col gap-5">
              {collectSizableForPerson(kitRawItems, personList[step]).map((item, itemIdx) => {
                const sizing = sizings[step]?.[item.product_id] || {};
                const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
                const hasColors = Array.isArray(item.colors) && item.colors.length > 0;

                return (
                  <div key={`${item.product_id}-${itemIdx}`} className="bg-stone-900 border border-stone-800 rounded overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {/* Image */}
                      <div className="w-20 h-20 bg-stone-800 rounded overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-stone-700 text-xs">No img</span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {item.brand && (
                          <p className="text-orange-400/70 font-bold uppercase tracking-wide mb-0.5" style={{ fontSize: '0.6rem' }}>{item.brand}</p>
                        )}
                        <p className="text-white font-semibold text-sm">
                          <Link
                            href={`/products/${item.product_id}`}
                            target="_blank"
                            className="hover:text-orange-400 transition-colors underline decoration-stone-600 hover:decoration-orange-400"
                          >
                            {item.name}
                          </Link>
                        </p>
                        <p className="text-stone-500 text-xs">{formatPrice(item.price_cents)}</p>
                        {sizing.size || sizing.color ? (
                          <p className="text-orange-400 text-xs mt-1">
                            {[sizing.size, sizing.color].filter(Boolean).join(' / ')}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="px-4 pb-4 space-y-3">
                      {/* Sizes */}
                      {hasSizes && (
                        <div>
                          <p className="label-tactical text-stone-600 mb-2" style={{ fontSize: '0.6rem' }}>SIZE</p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.sizes.map((s, si) => {
                              const label = typeof s === 'string' ? s : s.label;
                              return (
                                <button
                                  key={`${label}-${si}`}
                                  type="button"
                                  onClick={() => setSize(step, item.product_id, sizing.size === label ? '' : label)}
                                  className={`text-xs px-3 py-1.5 rounded border font-semibold uppercase tracking-wide transition-colors ${
                                    sizing.size === label
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
                      {hasColors && (
                        <div>
                          <p className="label-tactical text-stone-600 mb-2" style={{ fontSize: '0.6rem' }}>COLOR</p>
                          <div className="flex flex-wrap gap-2 items-center">
                            {item.colors.map((c, ci) => (
                              <button
                                key={`${c.name}-${ci}`}
                                type="button"
                                title={c.name}
                                onClick={() => setColor(step, item.product_id, sizing.color === c.name ? '' : c.name)}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${
                                  sizing.color === c.name
                                    ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/20'
                                    : 'border-stone-600 hover:border-stone-400'
                                }`}
                                style={{ backgroundColor: c.hex || '#888' }}
                              />
                            ))}
                            {sizing.color && <span className="text-stone-400 text-xs ml-1">{sizing.color}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={prevStep}
                className="border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors"
              >
                {step < personList.length - 1 ? `Next: ${buildLabel(personList[step + 1], step + 1, personList)} →` : 'Review →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Review ── */}
        {step === 'review' && (
          <div>
            <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Review Sizes</p>
            <h1 className="text-3xl font-extrabold uppercase tracking-wide mb-8">Confirm Your Selections</h1>

            <div className="flex flex-col gap-4 mb-8">
              {personList.map((person, pIdx) => (
                <div key={pIdx} className="bg-stone-900 border border-stone-800 rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-sm uppercase tracking-wide text-white">
                      {buildLabel(person, pIdx, personList)}
                    </p>
                    <button
                      onClick={() => setStep(pIdx)}
                      className="label-tactical text-orange-500 hover:text-orange-400 transition-colors tracking-widest"
                      style={{ fontSize: '0.65rem' }}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {collectSizableForPerson(kitRawItems, person).map((item, itemIdx) => {
                      const sizing = sizings[pIdx]?.[item.product_id] || {};
                      const summary = [sizing.size, sizing.color].filter(Boolean).join(' / ');
                      return (
                        <div key={`${item.product_id}-${itemIdx}`} className="flex items-center justify-between text-xs">
                          <Link href={`/products/${item.product_id}`} target="_blank"
                            className="text-stone-500 hover:text-orange-400 transition-colors truncate flex-1">
                            {item.name}
                          </Link>
                          <span className={`font-semibold ml-4 ${summary ? 'text-orange-400' : 'text-stone-600'}`}>
                            {summary || '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Cart total */}
            {cartItem && (
              <div className="flex items-center justify-between py-3 border-t border-stone-800 mb-6">
                <span className="label-tactical text-stone-500 tracking-widest">Kit Total</span>
                <span className="font-bold text-orange-400">{formatPrice(cartItem.price_cents)}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={confirmSizing}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest py-3 rounded transition-colors"
              >
                Confirm & Continue →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SizingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="label-tactical text-stone-500 tracking-widest">Loading sizing...</p>
      </main>
    }>
      <SizingPageContent />
    </Suspense>
  );
}
