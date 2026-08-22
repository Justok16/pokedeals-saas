"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

export default function LoginPage() {
  const [chargement, setChargement] = useState<Provider | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function connecterAvec(provider: Provider) {
    setErreur(null);
    setChargement(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErreur(error.message);
      setChargement(null);
    }
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]"
      />

      <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Connexion à PokéDeals
          </h1>
          <p className="mt-2 text-sm text-muted">
            Le marché des cartes Pokémon ne dort jamais. Toi non plus tu ne
            devrais pas avoir à le surveiller — on s&apos;en charge, 24/7.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => connecterAvec("google")}
              disabled={chargement !== null}
              className="rounded-full bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:bg-surface-hover disabled:opacity-50"
            >
              {chargement === "google" ? "Redirection…" : "Continuer avec Google"}
            </button>
            <button
              type="button"
              onClick={() => connecterAvec("github")}
              disabled={chargement !== null}
              className="rounded-full bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:bg-surface-hover disabled:opacity-50"
            >
              {chargement === "github" ? "Redirection…" : "Continuer avec GitHub"}
            </button>
          </div>

          {erreur && <p className="mt-4 text-sm text-danger">{erreur}</p>}
        </div>
      </main>
    </div>
  );
}
