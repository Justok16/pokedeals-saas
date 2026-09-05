-- Audit approfondi demandé par Justok (05/09/2026) : le seul signal de
-- livraison email disponible jusqu'ici était "SendGrid a accepté l'appel
-- API" (202) -- exactement l'angle mort qui avait caché le bug Resend en
-- mode sandbox (l'appel réussissait, rien n'était réellement livré). Cette
-- table stocke les VRAIS événements de livraison que SendGrid envoie en
-- temps réel (delivered/bounce/dropped/spamreport/...) via son Event
-- Webhook, reçus et vérifiés par app/api/webhooks/sendgrid.
--
-- Corrélation à l'alerte/précommande/canari précis à l'origine de l'email
-- via les colonnes produit/type_notification/reference_id, qui reprennent
-- les `custom_args` envoyés par le scraper (justok16/pokedeals,
-- notifications_saas._envoyer_email/connecteur_supabase_precoms._envoyer_email)
-- et échoués tels quels par SendGrid dans chaque événement.
--
-- Aucune policy RLS anon/authenticated : ni la table ni les événements
-- qu'elle contient ne concernent un utilisateur en particulier au sens
-- RLS -- écriture réservée à la fonction SECURITY DEFINER ci-dessous
-- (seul point d'entrée, pas d'accès direct à la table depuis l'API
-- publique), lecture réservée à service_role (SQL editor Supabase / MCP).

create table public.sendgrid_evenements (
  id bigint generated always as identity primary key,
  evenement text not null,
  email text not null,
  sg_message_id text,
  produit text,
  type_notification text,
  reference_id text,
  raison text,
  horodatage timestamptz not null,
  recu_le timestamptz not null default now(),
  brut jsonb not null
);

alter table public.sendgrid_evenements enable row level security;

create index sendgrid_evenements_evenement_idx on public.sendgrid_evenements (evenement);
create index sendgrid_evenements_reference_id_idx on public.sendgrid_evenements (reference_id);
create index sendgrid_evenements_horodatage_idx on public.sendgrid_evenements (horodatage);

-- SECURITY DEFINER + grant a anon/authenticated : permet a la route webhook
-- (qui n'utilise QUE la cle anon, jamais service_role, cf. justification
-- dans app/api/webhooks/sendgrid/route.ts) d'inserer sans etre bloquee par
-- RLS, sans pour autant exposer service_role dans l'application Next.js --
-- cette fonction ne sait faire QU'UNE seule chose (inserer un evenement
-- dans cette table precise), surface d'attaque volontairement etroite.
-- La verification de signature ECDSA du webhook (avant tout appel a cette
-- fonction) reste la vraie barriere contre des evenements forges ; un appel
-- direct a cette fonction sans passer par la route ne pourrait de toute
-- facon qu'inserer des lignes de log bruit, jamais lire ni modifier de
-- donnee utilisateur.
create or replace function public.enregistrer_evenement_sendgrid(
  p_evenement text,
  p_email text,
  p_sg_message_id text,
  p_produit text,
  p_type_notification text,
  p_reference_id text,
  p_raison text,
  p_horodatage timestamptz,
  p_brut jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sendgrid_evenements
    (evenement, email, sg_message_id, produit, type_notification, reference_id, raison, horodatage, brut)
  values
    (p_evenement, p_email, p_sg_message_id, p_produit, p_type_notification, p_reference_id, p_raison, p_horodatage, p_brut);
end;
$$;

grant execute on function public.enregistrer_evenement_sendgrid to anon, authenticated;
