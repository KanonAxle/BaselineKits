-- Education content managed from the admin dashboard.
-- Safe to re-run: tables use IF NOT EXISTS and seed rows are skipped when present.

create table if not exists education_categories (
  id text primary key,
  label text not null,
  blurb text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists education_articles (
  slug text primary key,
  title text not null,
  category_id text not null references education_categories(id) on delete restrict,
  summary text not null default '',
  read_minutes integer not null default 3,
  our_approach text not null default '',
  sections jsonb not null default '[]'::jsonb,
  related jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists education_articles_category_idx on education_articles (category_id);

-- Backend uses the service-role key; no client access.
alter table education_categories enable row level security;
alter table education_articles enable row level security;

insert into education_categories (id, label, blurb, sort_order) values
  ('philosophy', 'Our Philosophy', 'Why we build kits the way we do.', 10),
  ('water', 'Water', 'Storage, purification, and how much you really need.', 20),
  ('food', 'Food', 'Shelf life, calories, and what we choose to pack.', 30),
  ('medical', 'First Aid', 'What belongs in a kit and why.', 40),
  ('power', 'Power & Light', 'Staying lit and charged when the grid is down.', 50),
  ('planning', 'Planning', 'Plans, rotation, and readiness habits.', 60)
on conflict (id) do nothing;

insert into education_articles (slug, title, category_id, summary, read_minutes, our_approach, sections, related, sort_order) values
  ('why-we-build-around-72-hours', 'Why we build around a 72-hour baseline', 'philosophy', 'The reasoning behind our minimum standard and how kits scale up from it.', 4, 'Every kit is designed to carry a household through at least 72 hours, then scaled by household size and situation.', '[{"heading":"Why 72 hours","paragraphs":["Emergency management agencies commonly recommend being able to sustain yourself for at least three days. That window covers the period when roads, utilities, and responders are most stretched.","A baseline gives us a consistent standard. Everything beyond it, such as longer duration, more people, or harsher climates, is added deliberately rather than guessed at."]},{"heading":"How kits scale","paragraphs":["Our quiz asks about your environment, household, and duration so the baseline is adjusted to your situation."],"bullets":["More people means more water, food, and supplies","Colder climates add warmth and shelter items","Longer durations add redundancy for critical items"]}]'::jsonb, '["water-how-much-you-need"]'::jsonb, 10),
  ('water-how-much-you-need', 'How much water you actually need', 'water', 'A common planning figure, and what changes it.', 3, 'We plan around the commonly cited figure of one gallon per person per day and favor purification options that extend that supply.', '[{"heading":"The planning number","paragraphs":["A common guideline is about one gallon (roughly four liters) per person per day, covering drinking and basic hygiene.","Heat, activity, illness, pregnancy, and young children can all raise that number."]},{"heading":"Why we pair storage with purification","paragraphs":["Stored water is finite. Purification lets you turn other sources into safe drinking water, so the two work together."],"bullets":["Store a baseline supply for the first days","Carry a way to treat additional water","Know where nearby water sources are"]}]'::jsonb, '["why-we-build-around-72-hours"]'::jsonb, 20),
  ('choosing-shelf-stable-food', 'How we choose shelf-stable food', 'food', 'What we look for when picking food that must last and still be useful.', 3, 'We favor ready-to-eat or minimal-prep food with long shelf life, reasonable calories, and no special equipment.', '[{"heading":"What we look for","paragraphs":["In an emergency you may have no power, limited water, and high stress. Food should be simple."],"bullets":["Long shelf life with a clear date","Calorie density per weight","Little or no preparation","Variety so people actually eat it"]},{"heading":"Rotation","paragraphs":["Even long-life food expires. Check dates on a regular schedule and replace items before they run out."]}]'::jsonb, '["rotating-your-kit"]'::jsonb, 30),
  ('rotating-your-kit', 'Rotating and maintaining your kit', 'planning', 'A simple routine so your kit works when you need it.', 2, 'We flag items with expiration dates or sizing needs so you know what to review and when.', '[{"heading":"A simple routine","paragraphs":["Pick a recurring date, such as when clocks change, and review your kit."],"bullets":["Check expiration dates on food, water treatment, and medical items","Test batteries, lights, and radios","Update sizing for clothing and household changes"]}]'::jsonb, '["choosing-shelf-stable-food"]'::jsonb, 40)
on conflict (slug) do nothing;
