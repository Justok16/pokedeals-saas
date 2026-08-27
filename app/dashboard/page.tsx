import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMITE_CARTES_GRATUIT, estTesteurBeta } from "@/lib/stripe";
import { normaliser } from "@/lib/normaliser";
import {
  ajouterCarte,
  basculerNotifEmail,
  creerSessionCheckout,
  creerSessionPortail,
  deconnexion,
  envoyerFeedback,
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
    .select("id, titre, prix, url, plateforme, created_at, watchlist_items(nom_carte, langue, prix_seuil)")
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: nombreAlertesTotal } = await supabase
    .from("watchlist_alerts")
    .select("id", { count: "exact", head: true });

  const economieRecente = (alertes ?? []).reduce((total, alerte) => {
    const seuil = alerte.watchlist_items?.[0]?.prix_seuil;
    if (seuil == null) return total;
    return total + Math.max(0, Number(seuil) - Number(alerte.prix));
  }, 0);

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("notif_email")
    .eq("user_id", user.id)
    .maybeSingle();
  const notifEmailActive = preferences?.notif_email ?? true;

  // Prix marché (cote calculée par le scraper, cf. moteur_cote.obtenir_cote
  // côté Python) : donnée de marché, pas personnelle -- accessible à tout
  // utilisateur authentifié (cf. migration 0005_market_cotes.sql).
  const { data: cotesMarche } = await supabase
    .from("market_cotes")
    .select("nom_norm, langue, cote");
  const coteParCle = new Map(
    (cotesMarche ?? []).map((c) => [`${c.nom_norm}|${c.langue}`, Number(c.cote)])
  );
  function coteMarche(nomCarte: string, langue: string) {
    return coteParCle.get(`${normaliser(nomCarte)}|${langue.toLowerCase()}`);
  }

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

        <section className="grid grid-cols-3 gap-3">
          <div className={PANNEAU}>
            <p className="text-xs text-muted">Cartes surveillées</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {nombreCartes}
            </p>
          </div>
          <div className={PANNEAU}>
            <p className="text-xs text-muted">Bonnes affaires reçues</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {nombreAlertesTotal ?? 0}
            </p>
          </div>
          <div className={PANNEAU}>
            <p className="text-xs text-muted">Économies récentes</p>
            <p className="mt-1 font-mono text-2xl font-bold text-cyan">
              {economieRecente.toFixed(2)} €
            </p>
          </div>
        </section>

        {nombreCartes > 0 && <NotifPush banniere />}

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
              <div className="flex flex-col gap-1">
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
                <p className="font-mono text-xs text-cyan">
                  Illimité à 2,99 €/mois — 1,99 €/mois si tu as déjà PokéPrécoms
                </p>
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

        <section className={`${PANNEAU} flex items-center justify-between gap-4`}>
          <div>
            <p className="text-sm font-semibold text-foreground">
              🎁 Découvre PokéPrécoms
            </p>
            <p className="mt-1 text-xs text-muted">
              {abonnementActif
                ? "Notre service sœur alerte dès qu'une précommande Pokémon TCG (ETB, display, coffret...) devient disponible. Comme tu es déjà abonné à PokéDeals, tu ne paies que 1,99 €/mois en plus si tu t'abonnes."
                : "Notre service sœur alerte dès qu'une précommande Pokémon TCG (ETB, display, coffret...) devient disponible — 1 alerte gratuite pour essayer, puis 2,99 €/mois (1,99 € si tu es déjà abonné à PokéDeals)."}
            </p>
          </div>
          <a
            href="https://pokeprecoms.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className={`${LIEN_DISCRET} shrink-0`}
          >
            Découvrir →
          </a>
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

          {cartes?.map((carte) => {
            const cote = coteMarche(carte.nom_carte, carte.langue);
            return (
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
                    {cote != null ? ` · marché ≈ ${cote.toFixed(2)} €` : ""}
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
            );
          })}
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

          {alertes?.map((alerte) => {
            const item = alerte.watchlist_items?.[0];
            const cote = item ? coteMarche(item.nom_carte, item.langue) : undefined;
            const seuil = item?.prix_seuil != null ? Number(item.prix_seuil) : null;
            const reference = cote ?? seuil;
            const pourcentage =
              reference != null && reference > 0
                ? Math.round(((reference - Number(alerte.prix)) / reference) * 100)
                : null;
            const libelle = cote != null ? "sous la cote marché" : "sous ton seuil";
            return (
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
                <div className="flex items-center gap-3">
                  {pourcentage != null && pourcentage > 0 && (
                    <span
                      title={`${pourcentage}% ${libelle}`}
                      className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${
                        pourcentage >= 15
                          ? "bg-cyan/15 text-cyan"
                          : "bg-accent/15 text-accent"
                      }`}
                    >
                      −{pourcentage}%
                    </span>
                  )}
                  <p className="font-mono text-lg font-semibold text-accent">
                    {Number(alerte.prix).toFixed(2)} €
                  </p>
                </div>
              </a>
            );
          })}
        </section>

        <section className={PANNEAU}>
          <h2 className="text-sm font-medium text-foreground">
            Une suggestion ou une critique ?
          </h2>
          <p className="mt-1 text-xs text-muted">
            Le site est en phase de test — tous les retours sont utiles, bons
            ou mauvais.
          </p>
          {searchParams.feedback === "envoye" ? (
            <p className="mt-4 text-sm text-cyan">
              Merci, ton message a bien été envoyé !
            </p>
          ) : (
            <form action={envoyerFeedback} className="mt-4 flex flex-col gap-3">
              <textarea
                name="message"
                required
                maxLength={2000}
                rows={3}
                placeholder="Dis-moi ce qui te plaît, ce qui te manque, ce qui bugue..."
                className={`${CHAMP} resize-none`}
              />
              <button type="submit" className={`${BOUTON_PRIMAIRE} self-start`}>
                Envoyer
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
