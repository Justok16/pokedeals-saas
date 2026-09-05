-- Audit externe multi-IA du 05/09/2026 (DeepSeek/ChatGPT) : le controle
-- MAX_CARTES_PAR_UTILISATEUR (app/dashboard/actions.ts) fait un COUNT puis
-- un INSERT en deux requetes Supabase separees, non atomiques -- deux
-- appels concurrents (deux onglets, un double-clic tres rapide) peuvent
-- tous les deux lire un compte sous la limite avant que l'un des deux
-- n'insere, depassant alors legerement la limite. Impact reel faible
-- (protection anti-abus, pas une contrainte metier critique) mais facile a
-- fermer completement cote base : un trigger BEFORE INSERT qui serialise
-- les inserts d'un MEME utilisateur via un verrou transactionnel
-- (pg_advisory_xact_lock, cle = hash de l'user_id) avant de compter -- deux
-- transactions concurrentes pour des utilisateurs DIFFERENTS ne se
-- bloquent jamais entre elles (cle differente selon l'utilisateur).
--
-- Garde le controle cote application (actions.ts) INCHANGE : reste utile
-- pour un message d'erreur clair et rapide dans le cas normal (pas de
-- concurrence) ; ce trigger est le filet de securite qui garantit la
-- limite meme dans le cas concurrent, jamais contournable en passant par
-- l'API Supabase directement. Valeur (500) DOIT rester synchronisee avec
-- MAX_CARTES_PAR_UTILISATEUR dans app/dashboard/actions.ts.

create or replace function public.verifier_limite_watchlist_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nb_cartes integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text)::bigint);

  select count(*) into nb_cartes
  from public.watchlist_items
  where user_id = new.user_id;

  if nb_cartes >= 500 then
    raise exception 'Limite de 500 cartes surveillées atteinte -- retire-en une avant d''en ajouter une nouvelle.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists limiter_watchlist_items on public.watchlist_items;
create trigger limiter_watchlist_items
  before insert on public.watchlist_items
  for each row
  execute function public.verifier_limite_watchlist_items();
