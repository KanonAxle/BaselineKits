-- Enable row level security on every public table that doesn't have it yet.
-- The backend uses the Supabase secret (service-role) key, which bypasses RLS,
-- and the frontend never queries Supabase directly. With RLS on and no policies,
-- the public Data API (anon/authenticated) is denied by default.
-- Safe to re-run.

do $$
declare t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and not rowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    raise notice 'RLS enabled on public.%', t.tablename;
  end loop;
end $$;

-- Verify: every row should show rowsecurity = true.
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
