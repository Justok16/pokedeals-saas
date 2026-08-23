import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Confidentialite() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Politique de confidentialité
      </h1>
      <p className="text-xs text-muted">Dernière mise à jour : [date]</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          1. Données collectées
        </h2>
        <p className="text-sm text-muted">
          Lors de la connexion via Google ou GitHub : adresse email et
          identifiant de compte. Lors de l&apos;utilisation du service :
          les cartes de ta watchlist (nom, langue, prix seuil), tes
          préférences de notification, et les éventuels messages envoyés via
          le formulaire de retour. Si tu actives les notifications push, un
          identifiant d&apos;abonnement push technique (aucune donnée de
          localisation ou de navigation n&apos;est collectée).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          2. Finalité du traitement
        </h2>
        <p className="text-sm text-muted">
          Ces données sont utilisées uniquement pour faire fonctionner le
          service : t&apos;identifier, faire correspondre les bonnes
          affaires détectées à ta watchlist, t&apos;envoyer les alertes
          correspondantes, et gérer ton abonnement le cas échéant. Aucune
          donnée n&apos;est vendue ni utilisée à des fins publicitaires.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          3. Sous-traitants
        </h2>
        <p className="text-sm text-muted">
          Supabase (hébergement de la base de données et authentification),
          Vercel (hébergement de l&apos;application), Stripe (traitement des
          paiements, si abonnement souscrit), Resend (envoi des emails
          d&apos;alerte). Chacun agit en tant que sous-traitant, dans le
          cadre de ses propres engagements de confidentialité.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          4. Durée de conservation
        </h2>
        <p className="text-sm text-muted">
          Les données sont conservées tant que le compte est actif. La
          suppression du compte entraîne la suppression de la watchlist, des
          alertes et des préférences associées.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">5. Tes droits</h2>
        <p className="text-sm text-muted">
          Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de
          rectification, de suppression et d&apos;opposition sur tes données.
          Pour l&apos;exercer, contacte [ton adresse email]. La suppression
          des cartes et des préférences peut aussi se faire directement
          depuis le tableau de bord.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">6. Cookies</h2>
        <p className="text-sm text-muted">
          Seuls des cookies techniques strictement nécessaires à la
          connexion (session d&apos;authentification) sont utilisés. Aucun
          cookie de mesure d&apos;audience ou de publicité n&apos;est déposé.
        </p>
      </section>
    </main>
  );
}
