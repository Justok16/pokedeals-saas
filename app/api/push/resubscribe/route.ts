import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route dédiée (pas une Server Action) : appelée depuis le service worker
// (public/sw.js, événement pushsubscriptionchange), qui ne peut pas
// invoquer le protocole RPC des Server Actions Next.js -- un simple fetch()
// vers une URL stable est la seule option, cookies envoyés automatiquement
// (même origine). Même logique d'upsert que enregistrerAbonnementPush
// (app/dashboard/actions.ts), dupliquée ici plutôt que partagée car cette
// route doit rester indépendante du code "use server" (pas d'auth via
// redirect() possible pour une route API -- 401 explicite à la place).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!body.endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
