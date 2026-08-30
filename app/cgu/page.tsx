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
        <h2 className="text-sm font-semibold text-foreground">3. Offre et tarifs</h2>
        <p className="text-sm text-muted">
          Le service est 100% gratuit et illimité : aucun abonnement, aucune
          carte bancaire, aucun palier payant. Sur eBay et Vinted, où chaque
          carte suivie représente une recherche technique distincte, les
          cartes les plus suivies par l&apos;ensemble des utilisateurs
          peuvent être priorisées en cas de forte affluence, pour respecter
          les limites imposées par ces plateformes — ceci n&apos;affecte
          jamais les boutiques partenaires, scannées intégralement à chaque
          cycle quel que soit le nombre d&apos;utilisateurs.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">4. Résiliation du compte</h2>
        <p className="text-sm text-muted">
          Le service étant gratuit, il n&apos;y a rien à résilier au sens
          d&apos;un abonnement payant. L&apos;utilisateur peut cesser
          d&apos;utiliser le service à tout moment en se déconnectant, ou
          demander la suppression de son compte et des données associées via
          le contact ci-dessous.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          5. Responsabilité
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
        <h2 className="text-sm font-semibold text-foreground">6. Contact</h2>
        <p className="text-sm text-muted">
          Pour toute question relative à ces conditions : [ton adresse
          email].
        </p>
      </section>
    </main>
  );
}
