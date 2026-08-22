import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMITE_CARTES_GRATUIT, estTesteurBeta } from "@/lib/stripe";
import {
  ajouterCarte,
  basculerNotifEmail,
  creerSessionCheckout,
  creerSessionPortail,
  deconnexion,
  modifierCarte,
  supprimerCarte,
} from "./actions";
import NotifPush from "./notif-push";

const LABELS_LANGUE: Record<string, string> = {
  fr: "Français",
  jp: "Japonais",
  en: "Anglais",
  kr: "Coréen",
  cn: "Chinois",
};

const CHAMP =
  "rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cyan focus:outline-none";
const BOUTON_PRIMAIRE =
  "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_-10px_var(--accent)]";
const LIEN_DISCRET =
  "text-xs text-muted underline-offset-4 hover:text-foreground hover:underline";
const PANNEAU = "rounded-2xl bg-surface p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]";

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cartes, error } = await supabase
    .from("watchlist_items")
    .select("id, nom_carte, langue, prix_seuil, notes, created_at")
    .order("created_at", { ascending: false });

  const { data: abonnement } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const abonnementActif =
    abonnement?.status === "active" || abonnement?.status === "trialing";
  const testeurBeta = estTesteurBeta(user.email);
  const nombreCartes = cartes?.length ?? 0;

  const { data: alertes, error: erreurAlertes } = await supabase
    .from("watchlist_alerts")
    .select("id, titre, prix, url, plateforme, created_at, watchlist_items(nom_carte)")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("notif_email")
    .eq("user_id", user.id)
    .maybeSingle();
  const notifEmailActive = preferences?.notif_email ?? true;

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]"
      />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Ma watchlist
            </h1>
            <p className="font-mono text-sm text-muted">{user.email}</p>
          </div>
          <form action={deconnexion}>
            <button type="submit" className={LIEN_DISCRET}>
              Se déconnecter
            </button>
          </form>
        </header>

        {searchParams.abonnement === "succes" && (
          <p className="rounded-xl bg-cyan/10 px-4 py-3 text-sm text-cyan">
            Abonnement activé, merci ! Ça peut prendre quelques secondes à
            apparaître ci-dessous.
          </p>
        )}
        {searchParams.abonnement === "annule" && (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">
            Paiement annulé — tu peux réessayer à tout moment.
          </p>
        )}

        <section className="flex items-center justify-between gap-4">
          <div className="flex-1">
            {testeurBeta ? (
              <p className="font-mono text-xs text-cyan">
                Accès testeur — cartes illimitées
              </p>
            ) : abonnementActif ? (
              <p className="font-mono text-xs text-muted">
                Abonnement actif — cartes illimitées
                {abonnement?.current_period_end
                  ? ` · renouvellement le ${new Date(abonnement.current_period_end).toLocaleDateString("fr-FR")}`
                  : ""}
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <p className="font-mono text-xs text-muted">
                  {nombreCartes}/{LIMITE_CARTES_GRATUIT} cartes gratuites
                </p>
                <div className="h-1.5 flex-1 max-w-24 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${Math.min(100, (nombreCartes / LIMITE_CARTES_GRATUIT) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          {testeurBeta ? null : abonnementActif ? (
            <form action={creerSessionPortail}>
              <button type="submit" className={LIEN_DISCRET}>
                Gérer mon abonnement
              </button>
            </form>
          ) : (
            <form action={creerSessionCheckout}>
              <button type="submit" className={BOUTON_PRIMAIRE}>
                Passer à l&apos;abonnement
              </button>
            </form>
          )}
        </section>

        <section className={`${PANNEAU} flex flex-col gap-2`}>
          <h2 className="text-sm font-medium text-foreground">Notifications</h2>
          <NotifPush />
          <form action={basculerNotifEmail} className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notif_email"
              name="notif_email"
              defaultChecked={notifEmailActive}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <label htmlFor="notif_email" className="text-xs text-muted">
              Recevoir mes alertes par email
            </label>
            <button type="submit" className={LIEN_DISCRET}>
              Enregistrer
            </button>
          </form>
        </section>

        <section className={PANNEAU}>
          <h2 className="mb-4 text-sm font-medium text-foreground">
            Ajouter une carte à surveiller
          </h2>
          <form action={ajouterCarte} className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              name="nom_carte"
              placeholder="Nom de la carte (ex : Dracaufeu ex 199/165)"
              required
              className={`${CHAMP} sm:col-span-2`}
            />
            <select name="langue" defaultValue="fr" className={CHAMP}>
              {Object.entries(LABELS_LANGUE).map(([valeur, label]) => (
                <option key={valeur} value={valeur}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="prix_seuil"
              placeholder="Prix max (€)"
              step="0.01"
              min="0"
              required
              className={CHAMP}
            />
            <input
              type="text"
              name="notes"
              placeholder="Notes (optionnel)"
              className={`${CHAMP} sm:col-span-2`}
            />
            <button type="submit" className={`${BOUTON_PRIMAIRE} sm:col-span-2`}>
              Ajouter
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-2">
          {error && <p className="text-sm text-danger">Erreur de chargement : {error.message}</p>}

          {!error && cartes?.length === 0 && (
            <p className="text-sm text-muted">
              Aucune carte surveillée pour l&apos;instant.
            </p>
          )}

          {cartes?.map((carte) => (
            <details
              key={carte.id}
              className="rounded-xl bg-surface transition hover:bg-surface-hover"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{carte.nom_carte}</p>
                  <p className="font-mono text-xs text-muted">
                    {LABELS_LANGUE[carte.langue] ?? carte.langue} · seuil{" "}
                    {Number(carte.prix_seuil).toFixed(2)} €
                    {carte.notes ? ` · ${carte.notes}` : ""}
                  </p>
                </div>
                <span className={LIEN_DISCRET}>Modifier</span>
              </summary>

              <div className="px-4 pb-4 pl-9">
                <form action={modifierCarte} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={carte.id} />
                  <input
                    type="text"
                    name="nom_carte"
                    defaultValue={carte.nom_carte}
                    required
                    className={`${CHAMP} sm:col-span-2`}
                  />
                  <select name="langue" defaultValue={carte.langue} className={CHAMP}>
                    {Object.entries(LABELS_LANGUE).map(([valeur, label]) => (
                      <option key={valeur} value={valeur}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name="prix_seuil"
                    defaultValue={carte.prix_seuil}
                    step="0.01"
                    min="0"
                    required
                    className={CHAMP}
                  />
                  <input
                    type="text"
                    name="notes"
                    defaultValue={carte.notes ?? ""}
                    placeholder="Notes (optionnel)"
                    className={`${CHAMP} sm:col-span-2`}
                  />
                  <div className="flex items-center justify-between sm:col-span-2">
                    <button type="submit" className={BOUTON_PRIMAIRE}>
                      Enregistrer
                    </button>
                    <button
                      type="submit"
                      formAction={supprimerCarte}
                      className="text-xs text-danger hover:underline"
                    >
                      Retirer
                    </button>
                  </div>
                </form>
              </div>
            </details>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground">
            Dernières bonnes affaires détectées
          </h2>

          {erreurAlertes && (
            <p className="text-sm text-danger">
              Erreur de chargement : {erreurAlertes.message}
            </p>
          )}

          {!erreurAlertes && alertes?.length === 0 && (
            <p className="text-sm text-muted">
              Aucune alerte pour l&apos;instant — dès qu&apos;une carte de ta
              watchlist tombe sous ton seuil de prix, elle apparaîtra ici.
            </p>
          )}

          {alertes?.map((alerte) => (
            <a
              key={alerte.id}
              href={alerte.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 transition hover:-translate-y-0.5 hover:bg-surface-hover hover:shadow-[0_10px_24px_-14px_var(--cyan)]"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {alerte.watchlist_items?.[0]?.nom_carte ?? alerte.titre}
                </p>
                <p className="text-xs text-muted">
                  {alerte.titre}
                  {alerte.plateforme ? ` · ${alerte.plateforme}` : ""}
                </p>
              </div>
              <p className="font-mono text-lg font-semibold text-accent">
                {Number(alerte.prix).toFixed(2)} €
              </p>
            </a>
          ))}
        </section>
      </main>
    </div>
  );
}
