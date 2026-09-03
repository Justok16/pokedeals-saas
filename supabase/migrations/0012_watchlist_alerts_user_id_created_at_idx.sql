-- Audit externe du 03/09/2026 : la requete dashboard (app/dashboard/page.tsx)
-- filtre watchlist_alerts par user_id (RLS) puis trie par created_at desc
-- avec une limite -- l'index existant (watchlist_alerts_user_id_idx, colonne
-- user_id seule, migration 0002) ne couvre pas le tri, Postgres doit donc
-- trier les lignes de l'utilisateur en memoire a chaque chargement du
-- dashboard. Un index composite (user_id, created_at desc) permet de
-- satisfaire le filtre ET le tri directement depuis l'index, sans etape de
-- tri separee -- gain qui grossira avec le volume d'alertes par utilisateur.
-- L'index simple sur user_id (0002) reste utile a d'autres requetes
-- (ex. le count exact) et n'est pas remplace ici.

create index if not exists watchlist_alerts_user_id_created_at_idx
  on public.watchlist_alerts (user_id, created_at desc);
