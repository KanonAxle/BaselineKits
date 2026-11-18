'use client';
import { useState } from 'react';

const GROUPS = [
  {
    name: 'Built for you',
    items: ['Your scenario', 'Your environment', 'Your duration', 'Your people', 'Your budget', 'Nothing you won\u2019t use'],
    summary:
      'No generic kits. Every order starts with your answers \u2014 your scenario, your environment, your duration \u2014 and is built from there.',
  },
  {
    name: 'Curated gear',
    items: ['Trusted brands only', 'Water & filtration', 'Emergency food', 'Medical & first aid', 'Tools & lighting', 'Shelter & warmth'],
    summary:
      "We don\u2019t manufacture \u2014 we curate. Every item comes from established gear and supply companies and is hand-selected for reliability.",
  },
  {
    name: 'Handled by people',
    items: ['Hand-packed', 'Item-by-item checks', 'Verified before shipping', 'Shipped fast', 'Support after delivery'],
    summary:
      'Once you place your order, we hand-pack and verify your kit before it ships. Every item is checked before it leaves our facility.',
  },
];

export default function FeatureColumns() {
  const [active, setActive] = useState(0);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
      <h2 className="mb-16 text-2xl font-bold uppercase tracking-wider lg:mb-24">Why BaselineKits</h2>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
        {GROUPS.map((group, gi) => (
          <div key={group.name} className="lg:col-span-3">
            <h3 className="mb-4 text-lg font-semibold uppercase tracking-wide text-white">{group.name}</h3>
            <ul className="space-y-2.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  onMouseEnter={() => setActive(gi)}
                  className="cursor-default text-base leading-relaxed text-stone-400 transition-colors duration-150 hover:text-white"
                >
                  {item}
                </li>
              ))}
            </ul>
            {/* Mobile summary (hover descriptions don't exist on touch) */}
            <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-stone-400 lg:hidden">{group.summary}</p>
          </div>
        ))}
        {/* Hover description lives in a fixed spot: top of columns 10-12 */}
        <div className="hidden lg:col-span-3 lg:block">
          <p
            key={active}
            className="text-base leading-relaxed text-stone-400"
          >
            {GROUPS[active].summary}
          </p>
        </div>
      </div>
    </section>
  );
}
