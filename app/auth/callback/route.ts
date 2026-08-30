import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Audit du 30/08/2026 (meme bug trouve et corrige cote pokeprecoms) : `next`
// vient de la query string (donc du lien envoye a l'utilisateur,
// potentiellement forge par un attaquant) et etait concatene tel quel a
// `origin`. Une valeur sans "/" initial, ex. "@evil.com/phish", produit
// "https://<origin>@evil.com/phish" -- une URL valide ou l'origine legitime
// devient un userinfo et "evil.com" devient le VRAI hote : apres une vraie
// connexion Google/GitHub reussie, l'utilisateur est redirige vers un site
// tiers (open redirect exploitable en phishing). On n'accepte donc que les
// chemins relatifs commencant par un seul "/" (jamais "//", qui peut etre
// reinterprete comme une URL relative au schema par certains parseurs).
function cheminSuivantSur(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = cheminSuivantSur(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erreur=auth`);
}
