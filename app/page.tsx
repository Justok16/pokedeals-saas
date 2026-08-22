import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const ETAPES = [
  {
    titre: "Configure ta watchlist",
    texte:
      "Ajoute les cartes qui t'intéressent (nom, langue, édition) et fixe le prix maximum auquel tu es prêt à acheter.",
  },
  {
    titre: "On scanne le marché 24/7",
    texte:
      "eBay, Vinted, Leboncoin et des dizaines de boutiques françaises et japonaises spécialisées sont surveillées en continu.",
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
    reponse:
      "Jusqu'à 3 cartes surveillées gratuitement, sans limite de temps. Au-delà, un abonnement mensuel donne accès à une watchlist illimitée.",
  },
  {
    question: "Où sont scannées les bonnes affaires ?",
    reponse:
      "eBay, Vinted, Leboncoin, ainsi que des dizaines de boutiques françaises et japonaises spécialisées dans les cartes Pokémon.",
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
    "Alertes en temps réel sur les bonnes affaires Pokémon TCG : configure ta watchlist et reçois une alerte dès qu'une carte tombe sous ton seuil de prix.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Jusqu'à 3 cartes surveillées gratuitement, abonnement pour un accès illimité.",
  },
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

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-24 px-6 py-24">
        <section className="flex flex-col items-center gap-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
            Alertes de prix en direct
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
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
            {user ? "Aller à ma watchlist" : "Commencer"}
          </Link>
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
