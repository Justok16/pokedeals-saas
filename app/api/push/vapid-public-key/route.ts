import { NextResponse } from "next/server";

// Le service worker (public/sw.js) ne peut pas importer de code applicatif
// (pas de bundler compatible Turbopack pour lui, cf. son en-tête) ni lire
// les variables d'env NEXT_PUBLIC_* injectées à la compilation -- cette
// route lui donne un moyen simple de récupérer la clé publique VAPID au
// moment où il en a besoin (pushsubscriptionchange). Cette clé est déjà
// publique par construction (envoyée telle quelle au navigateur pour
// s'abonner), aucune donnée sensible exposée ici.
export async function GET() {
  return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" });
}
