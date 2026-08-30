-- Audit externe du 30/08/2026 : aucune limite de taille en base sur
-- nom_carte/notes -- les Server Actions (app/dashboard/actions.ts) valident
-- deja ces longueurs cote serveur, cette contrainte est une defense en
-- profondeur (un futur point d'ecriture qui oublierait cette validation ne
-- pourrait pas contourner la base). Memes valeurs que cote application.

alter table public.watchlist_items
  add constraint watchlist_items_nom_carte_longueur
    check (char_length(nom_carte) <= 200);

alter table public.watchlist_items
  add constraint watchlist_items_notes_longueur
    check (notes is null or char_length(notes) <= 500);
