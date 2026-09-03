-- Demande explicite de Justok (03/09/2026) : permettre de "mettre en pause"
-- une carte surveillee sans la supprimer (pratique pour une carte qu'on ne
-- veut plus voir apparaitre activement, sans perdre l'historique/le seuil
-- deja configure). `not null default true` : toute carte existante ou
-- nouvellement creee est active par defaut, comportement identique a avant
-- cette migration -- aucune carte n'est mise en pause implicitement.
--
-- Ecrite/lue par le SaaS (RLS normale, meme regles que le reste de la
-- ligne). Cote scraper (depot pokedeals, hors perimetre de ce depot) :
-- cette colonne n'est PAS encore consommee -- le scraper continue de
-- traiter toutes les cartes de watchlist_items independamment de `actif`.
-- Un suivi separe cote scraper serait necessaire pour qu'une carte en
-- pause cesse reellement de generer des alertes.

alter table public.watchlist_items
  add column if not exists actif boolean not null default true;
