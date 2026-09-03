-- Verification automatique periodique de disponibilite/prix pour les
-- "Dernieres bonnes affaires detectees" du dashboard (scraper/verification_alertes.py,
-- depot justok16/pokedeals, nouveau workflow verifier_alertes_watchlist.yml)
-- -- demande explicite de Justok (03/09/2026) : la liste affichee restait
-- figee sur le prix/statut au moment de la detection, sans jamais reverifier
-- ensuite si la carte etait encore disponible. Ecrite UNIQUEMENT par le
-- scraper (cle service_role), jamais par le SaaS lui-meme -- meme principe
-- que les colonnes push_envoye/email_envoye (migration 0009).
--
-- Nullable / defaut NULL (pas false) : NULL veut dire "jamais encore
-- verifie" (ex. alertes eBay, volontairement non couvertes en v1 -- cf.
-- docstring de scraper/verification_alertes.py, pas d'API fiable et
-- gratuite pour verifier une annonce eBay individuelle), distinct de
-- `disponible = false` (verifie et confirme indisponible/vendu). Le
-- dashboard doit donc traiter les 3 cas separement : null (aucun badge),
-- true (badge vert "toujours disponible"), false (badge rouge
-- "probablement vendu/indisponible").

alter table public.watchlist_alerts
  add column if not exists disponible boolean,
  add column if not exists prix_verifie numeric(10, 2),
  add column if not exists derniere_verification timestamptz;
