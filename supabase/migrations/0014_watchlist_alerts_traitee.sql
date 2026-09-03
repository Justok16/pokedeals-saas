-- Demande explicite de Justok (03/09/2026) : permettre a l'utilisateur de
-- marquer une alerte comme "traitee" (deal vu / decide, plus besoin qu'elle
-- encombre la liste par defaut) sans la supprimer -- purement une preference
-- d'affichage cote SaaS, aucun lien avec le suivi de notification du
-- scraper (push_envoye/email_envoye, migration 0009) ni avec la
-- verification de disponibilite (disponible/prix_verifie, migration 0011).
-- Nullable, pas de defaut explicite (NULL) : NULL et false sont tous deux
-- traites comme "non traitee" cote application, seul `true` marque une
-- alerte comme traitee -- pas de backfill necessaire, aucune ligne
-- existante n'a besoin d'etre reconsideree.
alter table public.watchlist_alerts
  add column if not exists traitee_par_utilisateur boolean;

-- watchlist_alerts est jusqu'ici en lecture seule cote utilisateur (cf.
-- commentaire de la policy select, migration 0002) : toutes les AUTRES
-- colonnes (prix, titre, url, disponible, push_envoye...) restent
-- strictement reservees au scraper (cle service_role, contourne RLS et les
-- GRANTs ci-dessous). Une simple policy "for update using/with check
-- auth.uid() = user_id" (le modele suivi par les autres tables, ex.
-- push_subscriptions en 0007) ouvrirait la modification de TOUTE colonne de
-- la ligne par son proprietaire -- casserait cette garantie. On combine donc
-- la policy RLS (filtre les LIGNES) avec un GRANT UPDATE cible sur la seule
-- colonne `traitee_par_utilisateur` (filtre les COLONNES) : Postgres
-- applique les deux restrictions cumulativement. `anon` n'a de toute facon
-- jamais acces (auth.uid() est NULL, aucune ligne ne peut matcher), on
-- retire son GRANT UPDATE par coherence/defense en profondeur uniquement.
-- `service_role` (scraper, webhooks...) n'est pas concerne par ces REVOKE
-- (GRANT distinct, non touche) et garde un acces complet a la table.
revoke update on public.watchlist_alerts from authenticated, anon;
grant update (traitee_par_utilisateur) on public.watchlist_alerts to authenticated;

create policy "watchlist_alerts_update_traitee_own"
  on public.watchlist_alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
