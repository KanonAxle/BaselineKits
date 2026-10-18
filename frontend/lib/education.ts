// Education content lives here. To add an article, append an object to ARTICLES.
// Each section renders as a heading plus paragraphs and an optional bullet list.

export type EducationCategory = {
  id: string;
  label: string;
  blurb: string;
};

export type ArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type EducationArticle = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  readMinutes: number;
  // Short statement of the decision we made and why; shown as a callout.
  ourApproach: string;
  sections: ArticleSection[];
  related?: string[];
};

export const CATEGORIES: EducationCategory[] = [
  { id: 'philosophy', label: 'Our Philosophy', blurb: 'Why we build kits the way we do.' },
  { id: 'water', label: 'Water', blurb: 'Storage, purification, and how much you really need.' },
  { id: 'food', label: 'Food', blurb: 'Shelf life, calories, and what we choose to pack.' },
  { id: 'medical', label: 'First Aid', blurb: 'What belongs in a kit and why.' },
  { id: 'power', label: 'Power & Light', blurb: 'Staying lit and charged when the grid is down.' },
  { id: 'planning', label: 'Planning', blurb: 'Plans, rotation, and readiness habits.' },
];

export const ARTICLES: EducationArticle[] = [
  {
    slug: 'why-we-build-around-72-hours',
    title: 'Why we build around a 72-hour baseline',
    category: 'philosophy',
    summary: 'The reasoning behind our minimum standard and how kits scale up from it.',
    readMinutes: 4,
    ourApproach: 'Every kit is designed to carry a household through at least 72 hours, then scaled by household size and situation.',
    sections: [
      {
        heading: 'Why 72 hours',
        paragraphs: [
          'Emergency management agencies commonly recommend being able to sustain yourself for at least three days. That window covers the period when roads, utilities, and responders are most stretched.',
          'A baseline gives us a consistent standard. Everything beyond it, such as longer duration, more people, or harsher climates, is added deliberately rather than guessed at.',
        ],
      },
      {
        heading: 'How kits scale',
        paragraphs: ['Our quiz asks about your environment, household, and duration so the baseline is adjusted to your situation.'],
        bullets: ['More people means more water, food, and supplies', 'Colder climates add warmth and shelter items', 'Longer durations add redundancy for critical items'],
      },
    ],
    related: ['water-how-much-you-need'],
  },
  {
    slug: 'water-how-much-you-need',
    title: 'How much water you actually need',
    category: 'water',
    summary: 'A common planning figure, and what changes it.',
    readMinutes: 3,
    ourApproach: 'We plan around the commonly cited figure of one gallon per person per day and favor purification options that extend that supply.',
    sections: [
      {
        heading: 'The planning number',
        paragraphs: [
          'A common guideline is about one gallon (roughly four liters) per person per day, covering drinking and basic hygiene.',
          'Heat, activity, illness, pregnancy, and young children can all raise that number.',
        ],
      },
      {
        heading: 'Why we pair storage with purification',
        paragraphs: ['Stored water is finite. Purification lets you turn other sources into safe drinking water, so the two work together.'],
        bullets: ['Store a baseline supply for the first days', 'Carry a way to treat additional water', 'Know where nearby water sources are'],
      },
    ],
    related: ['why-we-build-around-72-hours'],
  },
  {
    slug: 'choosing-shelf-stable-food',
    title: 'How we choose shelf-stable food',
    category: 'food',
    summary: 'What we look for when picking food that must last and still be useful.',
    readMinutes: 3,
    ourApproach: 'We favor ready-to-eat or minimal-prep food with long shelf life, reasonable calories, and no special equipment.',
    sections: [
      {
        heading: 'What we look for',
        paragraphs: ['In an emergency you may have no power, limited water, and high stress. Food should be simple.'],
        bullets: ['Long shelf life with a clear date', 'Calorie density per weight', 'Little or no preparation', 'Variety so people actually eat it'],
      },
      {
        heading: 'Rotation',
        paragraphs: ['Even long-life food expires. Check dates on a regular schedule and replace items before they run out.'],
      },
    ],
    related: ['rotating-your-kit'],
  },
  {
    slug: 'rotating-your-kit',
    title: 'Rotating and maintaining your kit',
    category: 'planning',
    summary: 'A simple routine so your kit works when you need it.',
    readMinutes: 2,
    ourApproach: 'We flag items with expiration dates or sizing needs so you know what to review and when.',
    sections: [
      {
        heading: 'A simple routine',
        paragraphs: ['Pick a recurring date, such as when clocks change, and review your kit.'],
        bullets: ['Check expiration dates on food, water treatment, and medical items', 'Test batteries, lights, and radios', 'Update sizing for clothing and household changes'],
      },
    ],
    related: ['choosing-shelf-stable-food'],
  },
];

export function getArticle(slug: string) {
  return ARTICLES.find(article => article.slug === slug);
}

export function getCategory(id: string) {
  return CATEGORIES.find(category => category.id === id);
}
