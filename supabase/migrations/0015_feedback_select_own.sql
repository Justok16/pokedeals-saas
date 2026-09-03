-- Audit externe du 03/09/2026 : envoyerFeedback (app/dashboard/actions.ts)
-- n'avait aucune limite de frequence, contrairement a watchlist_items
-- (MAX_CARTES_PAR_UTILISATEUR, migration 0008/0001) -- un formulaire HTML
-- n'empeche pas un appel repete direct de la Server Action. Compter les
-- envois des dernieres 24h cote serveur (nouvelle limite MAX_FEEDBACK_PAR_JOUR)
-- necessite une lecture, meme minimale (count exact), or la table `feedback`
-- n'avait volontairement AUCUNE policy select (cf. migration 0006 : "jamais
-- lire ceux des autres (pas de policy select)") -- sans policy dediee, ce
-- count aurait silencieusement renvoye 0 a chaque fois (RLS filtre TOUTES
-- les lignes, y compris les siennes), rendant la limite inoperante.
--
-- Cette policy suit exactement le meme modele "own row" que toutes les
-- autres tables du depot (watchlist_items, watchlist_alerts...) : un
-- utilisateur peut desormais lire (compter) SES PROPRES messages de
-- feedback, jamais ceux des autres -- Justok continue de tout consulter via
-- le dashboard Supabase (service_role, contourne RLS), comme avant.
create policy "feedback_select_own"
  on public.feedback for select
  to authenticated
  using (auth.uid() = user_id);
