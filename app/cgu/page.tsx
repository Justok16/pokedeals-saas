import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions générales" };

export default function CGU() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Conditions générales d&apos;utilisation et de vente
      </h1>
      <p className="text-xs text-muted">Dernière mise à jour : [date]</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">1. Objet</h2>
        <p className="text-sm text-muted">
          PokéDeals est un service permettant de configurer une liste de
          cartes Pokémon TCG à surveiller (nom, langue, prix maximum) et de
          recevoir une alerte (notification push et/ou email) lorsqu&apos;une
          annonce correspondante est détectée en dessous du seuil fixé, sur
          eBay, Vinted et des boutiques françaises et japonaises
          partenaires.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">2. Compte utilisateur</h2>
        <p className="text-sm text-muted">
          L&apos;accès au service nécessite une connexion via un compte
          Google ou GitHub existant. L&apos;utilisateur est responsable de la
          confidentialité de ses identifiants et de toute activité effectuée
          depuis son compte.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">3. Offres et tarifs</h2>
        <p className="text-sm text-muted">
          Un niveau gratuit permet de surveiller un nombre limité de cartes,
          sans limite de durée et sans moyen de paiement requis. Un
          abonnement payant, résiliable à tout moment, donne accès à une
          watchlist illimitée. Les tarifs en vigueur sont affichés sur la
          page d&apos;accueil au moment de la souscription.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          4. Droit de rétractation
        </h2>
        <p className="text-sm text-muted">
          Conformément à l&apos;article L221-28 du Code de la consommation,
          l&apos;abonnement étant un contenu numérique fourni immédiatement
          après paiement, l&apos;utilisateur renonce expressément à son droit
          de rétractation de 14 jours en validant la souscription.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">5. Résiliation</h2>
        <p className="text-sm text-muted">
          L&apos;abonnement peut être résilié à tout moment depuis le
          tableau de bord (« Gérer mon abonnement »). La résiliation prend
          effet à la fin de la période déjà payée ; aucun remboursement au
          prorata n&apos;est effectué.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          6. Responsabilité
        </h2>
        <p className="text-sm text-muted">
          Les informations de prix affichées proviennent de plateformes et
          boutiques tierces, actualisées automatiquement mais sans garantie
          d&apos;exactitude, de disponibilité ou de délai. PokéDeals
          n&apos;intervient à aucun moment dans les transactions entre
          l&apos;utilisateur et un vendeur tiers, et ne saurait être tenu
          responsable d&apos;une annonce erronée, expirée ou frauduleuse.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">7. Contact</h2>
        <p className="text-sm text-muted">
          Pour toute question relative à ces conditions : [ton adresse
          email].
        </p>
      </section>
    </main>
  );
}
