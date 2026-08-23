-- push_subscriptions n'avait qu'une policy insert/select/delete, pas
-- d'update -- or enregistrerAbonnementPush() (dashboard/actions.ts) fait un
-- upsert(..., { onConflict: "endpoint" }), qui declenche un UPDATE quand
-- l'endpoint existe deja (ex. reactivation apres desactivation, ou
-- abonnement recree par le navigateur avec le meme endpoint). Sans policy
-- update, ce cas etait bloque par RLS -- erreur cote Server Action, remontee
-- au client comme "Minified React error #441" (digest generique de Next.js
-- pour une erreur de Server Component/Action en production, cf.
-- https://react.dev/errors/441).
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
