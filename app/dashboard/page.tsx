import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normaliser } from "@/lib/normaliser";
import {
  ajouterCarte,
  basculerNotifEmail,
  deconnexion,
  definirAlerteTraitee,
  envoyerFeedback,
  modifierCarte,
  supprimerCarte,
  toggleActifCarte,
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

  // Audit externe du 03/09/2026 : `cartes`, `alertes`+leur count, et
  // `preferences` sont trois requêtes mutuellement indépendantes (aucune ne
  // lit le résultat d'une autre) mais s'exécutaient en série -- chacune
  // payait le round-trip réseau complet avant que la suivante démarre.
  // Promise.all les lance en parallèle. `cotesMarche` (plus bas) dépend en
  // revanche réellement des noms de cartes/langues obtenus ici et reste
  // donc séquentielle, après ce Promise.all.
  //
  // `alertesBrutes` + `nombreAlertesTotal` : auparavant deux requêtes
  // séparées vers la même table (mêmes lignes filtrées par RLS), l'une pour
  // les 50 dernières lignes, l'autre juste pour le count exact. supabase-js
  // renvoie le count exact total (avant troncature) sur la MÊME requête que
  // le select limité -- `.limit(50)` ne l'affecte pas -- donc un seul
  // round-trip suffit pour les deux.
  const [
    { data: cartes, error },
    { data: alertesBrutes, error: erreurAlertes, count: nombreAlertesTotal },
    { data: preferences, error: erreurPreferences },
  ] = await Promise.all([
    supabase
      .from("watchlist_items")
      .select("id, nom_carte, langue, prix_seuil, notes, created_at, actif")
      .order("created_at", { ascending: false }),
    supabase
      .from("watchlist_alerts")
      .select(
        "id, titre, prix, url, plateforme, created_at, disponible, prix_verifie, derniere_verification, traitee_par_utilisateur, watchlist_items(nom_carte, langue, prix_seuil)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("user_preferences")
      .select("notif_email")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const nombreCartes = cartes?.length ?? 0;

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

  // Demande explicite de Justok (03/09/2026) : une alerte "traitée" reste en
  // base (aucune suppression, cf. migration 0014) mais disparaît de la vue
  // par défaut -- `?alertes=toutes` la fait réapparaître. `null` et `false`
  // sont tous deux considérés comme "non traitée" (cf. commentaire de la
  // migration).
  const voirAlertesTraitees = searchParams.alertes === "toutes";
  // Demande explicite de Justok (04/09/2026, suite à un faux "toujours
  // disponible" sur une carte réellement en rupture) : une fois
  // `disponible` confirmé à `false` par verification_alertes.py (jamais
  // `null`, qui reste "pas encore vérifié" -- cf. sa docstring), la carte
  // n'a plus rien d'actionnable et disparaît de la liste, quel que soit
  // `?alertes=`, plutôt que de rester affichée grisée avec un message
  // "vendu" -- liste plus courte et 100% composée d'opportunités encore
  // valables.
  const alertesAffichees = alertes.filter((alerte) => {
    if (alerte.disponible === false) return false;
    return voirAlertesTraitees || !alerte.traitee_par_utilisateur;
  });

  // Audit externe du 03/09/2026 : l'erreur de cette requête n'était jamais
  // vérifiée -- en cas d'échec (RLS, panne réseau côté Supabase...) le
  // fallback silencieux `?? true` masquait totalement le problème : rien ne
  // distinguait "l'utilisateur n'a jamais réglé sa préférence" (cas normal,
  // notif_email absent) d'un vrai échec de requête. Un simple log serveur
  // rend l'échec visible dans les logs Vercel au lieu de se faire passer
  // pour une absence de données.
  if (erreurPreferences) {
    console.error("[dashboard] Échec du chargement de user_preferences :", erreurPreferences);
  }
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
  const { data: cotesMarche, error: erreurCotesMarche } =
    nomsNormalisesVoulus.size > 0
      ? await supabase
          .from("market_cotes")
          .select("nom_norm, langue, cote")
          .in("nom_norm", Array.from(nomsNormalisesVoulus))
          .in("langue", Array.from(languesVoulues))
      : { data: [], error: null };
  // Audit externe du 03/09/2026 : même problème que `preferences` ci-dessus
  // -- une erreur ici retombait silencieusement sur une Map vide (aucune
  // cote affichée), indiscernable du cas normal "pas encore de cote connue
  // pour ces cartes". Log serveur pour rendre un échec réel visible.
  if (erreurCotesMarche) {
    console.error("[dashboard] Échec du chargement de market_cotes :", erreurCotesMarche);
  }
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
          {notifEmailActive && (
            // Ajouté le 04/09/2026 : sans nom de domaine vérifié pour
            // l'expéditeur (SendGrid en vérification "Single Sender", pas de
            // domaine complet SPF/DKIM/DMARC), les premiers emails d'un
            // nouvel expéditeur atterrissent souvent en spam -- confirmé en
            // conditions réelles sur le canari de livraison le jour même.
            // Prévenir directement ici plutôt que de laisser l'utilisateur
            // penser que la fonctionnalité ne marche pas.
            <p className="text-xs text-muted">
              Tu ne reçois rien par email ? Vérifie ton dossier spam/courrier
              indésirable, surtout pour les premiers emails.
            </p>
          )}
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
              className={`rounded-xl bg-surface transition hover:bg-surface-hover ${
                carte.actif ? "" : "opacity-50"
              }`}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    carte.actif ? "bg-accent" : "bg-muted"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {carte.nom_carte}
                    {!carte.actif && (
                      <span className="ml-2 font-mono text-xs text-muted">(en pause)</span>
                    )}
                  </p>
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
                  <div className="flex items-center justify-between gap-3 sm:col-span-2">
                    <button type="submit" className={BOUTON_PRIMAIRE}>
                      Enregistrer
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        formAction={toggleActifCarte}
                        name="actif"
                        value={carte.actif ? "false" : "true"}
                        className={LIEN_DISCRET}
                      >
                        {carte.actif ? "Mettre en pause" : "Réactiver"}
                      </button>
                      <button
                        type="submit"
                        formAction={supprimerCarte}
                        className="text-xs text-danger hover:underline"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </details>
            );
          })}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Dernières bonnes affaires détectées
            </h2>
            {alertes.some((a) => a.traitee_par_utilisateur) && (
              <a
                href={voirAlertesTraitees ? "/dashboard" : "/dashboard?alertes=toutes"}
                className={LIEN_DISCRET}
              >
                {voirAlertesTraitees
                  ? "Masquer les alertes traitées"
                  : "Voir les alertes traitées"}
              </a>
            )}
          </div>

          {erreurAlertes && (
            <p className="text-sm text-danger">
              Erreur de chargement : {erreurAlertes.message}
            </p>
          )}

          {!erreurAlertes && alertesAffichees.length === 0 && (
            <p className="text-sm text-muted">
              {alertes.length === 0
                ? "Aucune alerte pour l'instant — dès qu'une carte de ta watchlist tombe sous ton seuil de prix, elle apparaîtra ici."
                : "Aucune alerte non traitée pour l'instant."}
            </p>
          )}

          {alertesAffichees.map((alerte) => {
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
              <div
                key={alerte.id}
                className={`flex items-center gap-2 rounded-xl bg-surface px-4 py-3 transition hover:bg-surface-hover ${
                  alerte.traitee_par_utilisateur ? "opacity-50" : ""
                }`}
              >
                <a
                  href={alerte.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_var(--cyan)]"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {alerte.watchlist_items?.nom_carte ?? alerte.titre}
                    </p>
                    <p className="text-xs text-muted">
                      {alerte.titre}
                      {alerte.plateforme ? ` · ${alerte.plateforme}` : ""}
                    </p>
                    {/* alerte.disponible === false est filtré en amont
                        (alertesAffichees) -- une alerte affichée ici a donc
                        toujours disponible=true dès que vérifiée une fois. */}
                    {alerte.derniere_verification != null && (
                      <p className="mt-1 text-xs font-medium text-cyan">
                        {`Toujours disponible${
                          alerte.prix_verifie != null
                            ? ` à ${Number(alerte.prix_verifie).toFixed(2)} €`
                            : ""
                        }`}
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
                <form action={definirAlerteTraitee}>
                  <input type="hidden" name="id" value={alerte.id} />
                  <button
                    type="submit"
                    name="traitee"
                    value={alerte.traitee_par_utilisateur ? "false" : "true"}
                    title={
                      alerte.traitee_par_utilisateur
                        ? "Marquer comme non traitée"
                        : "Marquer comme traitée"
                    }
                    className={`${LIEN_DISCRET} shrink-0`}
                  >
                    {alerte.traitee_par_utilisateur ? "↺" : "✓"}
                  </button>
                </form>
              </div>
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
