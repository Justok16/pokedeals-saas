-- Cote (prix de reference marche) calculee par le scraper pour chaque
-- carte scannee (scraper/moteur_cote.obtenir_cote), exposee ici pour
-- affichage d'un "prix marche" dans le dashboard. Ecrite UNIQUEMENT par le
-- scraper (cle service_role, cf. connecteur_supabase.enregistrer_cotes_marche)
-- ; lue par tout utilisateur authentifie (donnee de marche, pas personnelle
-- -- pas de notion de proprietaire ici, contrairement a watchlist_items).
--
-- Cle (nom_norm, langue) : nom_norm = meme normalisation que cote scraper
-- (filtre_annonces.normaliser : minuscules, sans accents, tirets/points
-- remplaces par des espaces) ET cote SaaS (lib/normaliser.ts, a garder en
-- phase avec la version Python si l'une des deux change).

create table if not exists public.market_cotes (
  nom_norm text not null,
  langue text not null,
  cote numeric(10, 2) not null,
  confiance integer,
  updated_at timestamptz not null default now(),
  primary key (nom_norm, langue)
);

alter table public.market_cotes enable row level security;

create policy "market_cotes_select_authenticated"
  on public.market_cotes for select
  to authenticated
  using (true);
