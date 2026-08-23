-- Retours utilisateurs (suggestions, critiques) envoyes depuis le dashboard.
-- Lus par Justok directement dans le Table Editor / SQL Editor Supabase,
-- pas d'interface de lecture cote app (pas besoin pour l'instant).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

-- Chaque utilisateur peut seulement CREER son propre retour, jamais lire
-- ceux des autres (pas de policy select) -- Justok les consulte via le
-- dashboard Supabase (service_role, contourne RLS).
create policy "feedback_insert_own"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);
