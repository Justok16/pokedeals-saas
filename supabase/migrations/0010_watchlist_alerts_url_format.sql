-- Audit interne du 30/08/2026 : `watchlist_alerts.url` (rendue directement
-- en <a href> dans le dashboard) n'avait aucune contrainte de format --
-- ecrite exclusivement par le scraper via la cle service_role (jamais par
-- un utilisateur de ce depot), donc pas exploitable aujourd'hui, mais
-- aucune defense si le scraper stockait un jour une valeur malformee
-- (ex. un champ "javascript:" recupere par erreur sur une fiche produit
-- scrapee). Meme principe de defense-en-profondeur que les limites de
-- longueur ajoutees en 0008 -- ne bloque rien de legitime (toute vraie
-- URL d'annonce commence par http:// ou https://).

alter table public.watchlist_alerts
  add constraint watchlist_alerts_url_http check (url ~ '^https?://');
