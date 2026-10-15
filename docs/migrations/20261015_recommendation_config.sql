CREATE TABLE IF NOT EXISTS public.recommendation_config (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  weights JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recommendation_config ENABLE ROW LEVEL SECURITY;
