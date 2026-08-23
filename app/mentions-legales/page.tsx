import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Mentions légales</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Éditeur du site</h2>
        <p className="text-sm text-muted">
          [Ton nom complet]
          <br />
          [Ton adresse]
          <br />
          [Ton statut — ex. micro-entrepreneur, SIRET une fois immatriculé]
          <br />
          Contact : [ton adresse email]
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Directeur de la publication</h2>
        <p className="text-sm text-muted">[Ton nom complet]</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Hébergement</h2>
        <p className="text-sm text-muted">
          Vercel Inc. — hébergement de l&apos;application web (vercel.com)
          <br />
          Supabase Inc. — hébergement de la base de données (supabase.com)
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Propriété intellectuelle</h2>
        <p className="text-sm text-muted">
          PokéDeals n&apos;est affilié à The Pokémon Company, Nintendo, Game
          Freak ni Creatures Inc. « Pokémon » et les noms des cartes citées
          sont des marques déposées de leurs propriétaires respectifs,
          utilisées ici à titre purement descriptif et informatif.
        </p>
      </section>
    </main>
  );
}
