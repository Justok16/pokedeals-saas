import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LIMITE_CARTES_GRATUIT } from "@/lib/stripe";

const SOURCES = [
  { nom: "eBay", detail: "Annonces et enchères" },
  { nom: "Vinted", detail: "Nouvelles annonces particuliers" },
  { nom: "Boutiques spécialisées", detail: "France 🇫🇷 et Japon 🇯🇵" },
];

const ETAPES = [
  {
    titre: "Configure ta watchlist",
    texte:
      "Ajoute les cartes qui t'intéressent (nom, langue, édition) et fixe le prix maximum auquel tu es prêt à acheter.",
  },
  {
    titre: "On surveille le marché pour toi",
    texte:
      "eBay, Vinted et des dizaines de boutiques françaises et japonaises sont scannées automatiquement, plusieurs fois par heure.",
  },
  {
    titre: "Tu reçois l'alerte",
    texte:
      "Dès qu'une annonce passe sous ton seuil, une notification push ou un email t'arrive avec le lien direct.",
  },
];

const FAQ = [
  {
    question: "Combien coûte PokéDeals ?",
    reponse: `Jusqu'à ${LIMITE_CARTES_GRATUIT} cartes surveillées gratuitement, sans limite de durée, sans carte bancaire requise. Au-delà, un abonnement à 7,99 €/mois donne accès à une watchlist illimitée.`,
  },
  {
    question: "Où sont scannées les bonnes affaires ?",
    reponse:
      "eBay, Vinted, ainsi que des dizaines de boutiques françaises et japonaises spécialisées dans les cartes Pokémon.",
  },
  {
    question: "À quelle fréquence les annonces sont-elles scannées ?",
    reponse:
      "Automatiquement, plusieurs fois par heure selon la source — pas un scan permanent en temps réel, mais une surveillance régulière et continue.",
  },
  {
    question: "Comment je reçois mes alertes ?",
    reponse:
      "Par notification push directement dans le navigateur, et/ou par email — les deux canaux sont configurables indépendamment depuis le tableau de bord.",
  },
];

const DONNEES_STRUCTUREES = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PokéDeals",
  applicationCategory: "ShoppingApplication",
  operatingSystem: "Web",
  description:
    "Alertes automatiques sur les bonnes affaires Pokémon TCG : configure ta watchlist et reçois une alerte dès qu'une carte tombe sous ton seuil de prix.",
  offers: [
    {
      "@type": "Offer",
      name: "Gratuit",
      price: "0",
      priceCurrency: "EUR",
      description: `Jusqu'à ${LIMITE_CARTES_GRATUIT} cartes surveillées.`,
    },
    {
      "@type": "Offer",
      name: "Abonnement",
      price: "7.99",
      priceCurrency: "EUR",
      description: "Watchlist illimitée.",
    },
  ],
};

const DONNEES_STRUCTUREES_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.reponse },
  })),
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES_FAQ) }}
      />

      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-24 px-6 py-24">
        <section className="flex flex-col items-center gap-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
            Ne cherche plus les bonnes affaires. On les trouve pour toi.
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            PokéDeals
          </h1>
          <p className="max-w-md text-lg text-muted">
            Configure ta watchlist de cartes Pokémon TCG et reçois une alerte dès
            qu&apos;une bonne affaire tombe en dessous de ton seuil de prix.
          </p>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_-10px_var(--accent)]"
          >
            {user ? "Aller à ma watchlist" : "Commencer gratuitement"}
          </Link>
        </section>

        <section className="w-full max-w-md">
          <div className="rounded-2xl bg-surface p-5">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
              🔥 Bonne affaire détectée
            </p>
            <p className="mt-3 text-base font-semibold text-foreground">
              Dracaufeu ex 199/165
            </p>
            <p className="font-mono text-xs text-muted">
              🇫🇷 Français · Near Mint · eBay
            </p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted">Prix trouvé</p>
                <p className="font-mono text-2xl font-bold text-accent">38,50 €</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Ton seuil</p>
                <p className="font-mono text-sm text-foreground">50,00 €</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Économie</p>
                <p className="font-mono text-sm font-semibold text-cyan">−11,50 €</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Exemple d&apos;alerte reçue par notification push ou email.
          </p>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Sources surveillées
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOURCES.map((source) => (
              <div key={source.nom} className="rounded-2xl bg-surface p-5 text-center">
                <p className="text-sm font-semibold text-foreground">{source.nom}</p>
                <p className="mt-1 text-xs text-muted">{source.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Comment ça marche
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {ETAPES.map((etape, i) => (
              <div key={etape.titre} className="rounded-2xl bg-surface p-5">
                <span className="font-mono text-xs text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                  {etape.titre}
                </h3>
                <p className="mt-1 text-sm text-muted">{etape.texte}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Tarifs
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface p-6">
              <p className="text-sm font-semibold text-foreground">Gratuit</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">0 €</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
                <li>{LIMITE_CARTES_GRATUIT} cartes surveillées</li>
                <li>Alertes push et email</li>
                <li>Toutes les sources</li>
                <li>Sans limite de durée</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-surface p-6 ring-1 ring-accent/40">
              <p className="text-sm font-semibold text-accent">Abonnement</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                7,99 €<span className="text-sm font-normal text-muted">/mois</span>
              </p>
              <p className="mt-1 text-xs text-cyan">
                4,99 €/mois à vie pour les 200 premiers abonnés fondateurs
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
                <li>Watchlist illimitée</li>
                <li>Alertes push et email</li>
                <li>Toutes les sources</li>
                <li>Résiliable à tout moment</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-xs text-muted">
            Aucune carte bancaire requise pour commencer gratuitement.
          </p>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Questions fréquentes
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((item) => (
              <details key={item.question} className="rounded-2xl bg-surface p-5">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-muted">{item.reponse}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
