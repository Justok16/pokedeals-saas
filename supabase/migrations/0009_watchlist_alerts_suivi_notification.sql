-- Audit externe du 30/08/2026 : une alerte watchlist_alerts inseree par le
-- scraper etait notifiee (push/email) UNE SEULE FOIS, au moment de son
-- insertion -- si push ET email echouaient tous les deux ce cycle-la (ex.
-- panne Resend/service Web Push), l'alerte restait en base mais n'etait
-- plus JAMAIS retentee (les cycles suivants la voient comme un doublon deja
-- connu). Ces deux colonnes permettent au scraper de retrouver et retenter
-- UNIQUEMENT les canaux non encore livres, cycle apres cycle, jusqu'a
-- livraison reelle (cf. connecteur_supabase.lister_alertes_a_notifier /
-- marquer_notification_envoyee cote scraper).
--
-- IMPORTANT -- backfill des lignes EXISTANTES a true (pas false) : sans ca,
-- toutes les alertes deja enregistrees avant cette migration seraient
-- reconsiderees "en attente" au prochain cycle et notifieraient d'un coup
-- potentiellement des semaines de vieux deals a chaque utilisateur. Les
-- lignes deja existantes sont donc traitees comme deja closes (qu'elles
-- aient reellement ete livrees ou non -- un vieux deal est de toute facon
-- perime, pas la peine de rouvrir cet historique) ; seules les alertes
-- inserees APRES cette migration beneficient du suivi/retry (defaut false).

alter table public.watchlist_alerts
  add column push_envoye boolean not null default true;

alter table public.watchlist_alerts
  add column email_envoye boolean not null default true;

alter table public.watchlist_alerts
  alter column push_envoye set default false;

alter table public.watchlist_alerts
  alter column email_envoye set default false;
