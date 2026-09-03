import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normaliser } from "@/lib/normaliser";
import {
  ajouterCarte,
  basculerNotifEmail,
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

// Renforcement défensif (31/08/2026, signalement direct de l'utilisateur --
// préférence email "recochée" à chaque visite) : force un rendu dynamique
// systématique, sans AUCUNE mise en cache possible côté Next.js pour cette
// page. La lecture de cookies (auth.getUser()) le forçait déjà implicitement,
// mais le rendre explicite élimine toute ambiguïté sur ce point précis --
// cette page ne doit jamais servir une préférence utilisateur périmée.
export const dynamic = "force-dynamic";

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

  const nombreCartes = cartes?.length ?? 0;

  const { data: alertesBrutes, error: erreurAlertes } = await supabase
    .from("watchlist_alerts")
    .select(
      "id, titre, prix, url, plateforme, created_at, disponible, prix_verifie, derniere_verification, watchlist_items(nom_carte, langue, prix_seuil)"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: nombreAlertesTotal } = await supabase
    .from("watchlist_alerts")
    .select("id", { count: "exact", head: true });

  // Audit du 30/08/2026 : `watchlist_item_id` est une clé étrangère
  // many-to-one (watchlist_alerts -> watchlist_items) -- PostgREST renvoie
  // donc `watchlist_items` comme un OBJET unique au moment de l'exécution,
  // jamais un tableau. Sans types `Database` générés, supabase-js infère
  // pourtant un type tableau par défaut pour TOUT embed (il ne peut pas
  // déduire la cardinalité réelle de la simple chaîne .select()) -- le code
  // accédait donc à `?.[0]` sur un objet qui n'a jamais de clé "0",
  // toujours `undefined` (chaînage optionnel, jamais d'erreur), donc
  // silencieusement faux plutôt qu'un crash visible. Conséquence réelle :
  // `economieRecente` ("Économies récentes") affichait toujours 0,00 € pour
  // tout le monde, et le badge de décote + le nom canonique de la carte
  // (ci-dessous) ne s'affichaient jamais. Corrigé une seule fois ici (pas
  // de types `Database` générés dans ce dépôt) plutôt que de disperser des
  // casts sur chaque site d'usage.
  type ItemEmbedde = { nom_carte: string; langue: string; prix_seuil: number } | null;
  const alertes = (alertesBrutes ?? []).map((a) => ({
    ...a,
    watchlist_items: a.watchlist_items as unknown as ItemEmbedde,
  }));

  const economieRecente = alertes.reduce((total, alerte) => {
    const seuil = alerte.watchlist_items?.prix_seuil;
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
  // utilisateur authentifié (cf. migration 0005_market_cotes.sql). Audit
  // externe du 30/08/2026 : cette requête chargeait TOUTE la table sans
  // filtre (viable à quelques centaines de lignes, mais ça grossirait à
  // chaque carte scannée par le scraper) -- ne récupère maintenant que les
  // cotes des cartes/langues réellement affichées sur CETTE page (watchlist
  // + 20 dernières alertes). Le croisement nom_norm × langue via deux .in()
  // peut ramener quelques lignes en trop (produit cartésien, pas une
  // correspondance exacte par paire) mais reste minime pour un utilisateur
  // donné, très loin de la table entière.
  const nomsNormalisesVoulus = new Set<string>();
  const languesVoulues = new Set<string>();
  for (const carte of cartes ?? []) {
    nomsNormalisesVoulus.add(normaliser(carte.nom_carte));
    languesVoulues.add(carte.langue.toLowerCase());
  }
  for (const alerte of alertes) {
    const item = alerte.watchlist_items;
    if (item) {
      nomsNormalisesVoulus.add(normaliser(item.nom_carte));
      languesVoulues.add(item.langue.toLowerCase());
    }
  }
  const { data: cotesMarche } =
    nomsNormalisesVoulus.size > 0
      ? await supabase
          .from("market_cotes")
          .select("nom_norm, langue, cote")
          .in("nom_norm", Array.from(nomsNormalisesVoulus))
          .in("langue", Array.from(languesVoulues))
      : { data: [] };
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

        <p className="text-center font-mono text-xs text-cyan">
          🆓 100% gratuit et illimité — surveille autant de cartes que tu veux
        </p>

        {nombreCartes > 0 && <NotifPush banniere />}

        <section className={`${PANNEAU} flex items-center justify-between gap-4`}>
          <div>
            <p className="text-sm font-semibold text-foreground">
              🎁 Découvre PokéPrécoms
            </p>
            <p className="mt-1 text-xs text-muted">
              Notre service sœur alerte dès qu&apos;un produit scellé Pokémon
              TCG (ETB, display, coffret...) passe en précommande disponible
              — 100% gratuit et illimité, comme ici.
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
            {searchParams.notifications === "enregistre" && (
              <span className="text-xs text-cyan">Enregistré ✓</span>
            )}
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

          {!erreurAlertes && alertes.length === 0 && (
            <p className="text-sm text-muted">
              Aucune alerte pour l&apos;instant — dès qu&apos;une carte de ta
              watchlist tombe sous ton seuil de prix, elle apparaîtra ici.
            </p>
          )}

          {alertes.map((alerte) => {
            const item = alerte.watchlist_items;
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
                    {alerte.watchlist_items?.nom_carte ?? alerte.titre}
                  </p>
                  <p className="text-xs text-muted">
                    {alerte.titre}
                    {alerte.plateforme ? ` · ${alerte.plateforme}` : ""}
                  </p>
                  {alerte.derniere_verification != null && (
                    <p
                      className={`mt-1 text-xs font-medium ${
                        alerte.disponible ? "text-cyan" : "text-danger"
                      }`}
                    >
                      {alerte.disponible
                        ? `Toujours disponible${
                            alerte.prix_verifie != null
                              ? ` à ${Number(alerte.prix_verifie).toFixed(2)} €`
                              : ""
                          }`
                        : "Probablement vendu / indisponible"}
                    </p>
                  )}
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
