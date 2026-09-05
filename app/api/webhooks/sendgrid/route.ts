import { NextRequest, NextResponse } from "next/server";
import { EventWebhook, EventWebhookHeader } from "@sendgrid/eventwebhook";
import { createClient } from "@supabase/supabase-js";

// Audit approfondi demandé par Justok (05/09/2026) : jusqu'ici, le seul
// signal de livraison email disponible était "SendGrid a accepté l'appel
// API" (202) -- exactement l'angle mort qui avait caché le bug Resend en
// mode sandbox (l'appel réussissait, aucune erreur loguée, mais Resend ne
// livrait en réalité qu'au seul propriétaire du compte). SendGrid propose
// un Event Webhook signé (ECDSA) qui notifie en temps réel les VRAIS
// événements de livraison (delivered/bounce/dropped/spamreport/...) --
// cette route les reçoit, vérifie leur authenticité, et les enregistre
// dans `sendgrid_evenements` (migration 0017) via la fonction SECURITY
// DEFINER dédiée (jamais la clé service_role dans cette application Next.js
// -- cf. sa justification dans la migration).
//
// Utilise @sendgrid/eventwebhook (bibliothèque officielle Twilio/SendGrid)
// plutôt qu'une réimplémentation de la vérification de signature ECDSA à
// la main -- même principe que pywebpush côté scraper (justok16/pokedeals) :
// un protocole cryptographique ne se réimplémente pas soi-même, l'erreur y
// est facile et silencieuse.
//
// ACTIVATION MANUELLE REQUISE côté SendGrid (aucune API ne permet de le
// faire à la place de Justok) : Settings > Mail Settings > Event Webhook,
// activer "Signed Event Webhook", renseigner l'URL de cette route
// (https://<domaine>/api/webhooks/sendgrid), cocher au minimum Delivered/
// Bounced/Dropped/Spam Report/Blocked, copier la "Verification Key" fournie
// dans le secret Vercel SENDGRID_WEBHOOK_PUBLIC_KEY.

function clePubliqueECDSA() {
  const brute = (process.env.SENDGRID_WEBHOOK_PUBLIC_KEY ?? "").trim();
  const pem = brute.includes("BEGIN PUBLIC KEY")
    ? brute
    : `-----BEGIN PUBLIC KEY-----\n${brute}\n-----END PUBLIC KEY-----`;
  return new EventWebhook().convertPublicKeyToECDSA(pem);
}

type EvenementSendGrid = {
  event?: string;
  email?: string;
  sg_message_id?: string;
  timestamp?: number;
  reason?: string;
  response?: string;
  // Echoués tels quels par SendGrid depuis `custom_args` (cf.
  // notifications_saas._envoyer_email côté scraper) -- absents sur les
  // emails envoyés avant ce correctif, ou par un chemin qui ne les passe
  // pas encore.
  produit?: string;
  type_notification?: string;
  reference_id?: string;
};

export async function POST(request: NextRequest) {
  if (!process.env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
    // Webhook pas encore activé côté SendGrid -- ne devrait jamais être
    // appelé tant que Justok n'a pas renseigné l'URL dans son dashboard,
    // mais on refuse explicitement plutôt que d'avaler silencieusement un
    // flux de données qu'on ne peut pas authentifier.
    return NextResponse.json({ error: "webhook non configuré" }, { status: 503 });
  }

  // Corps BRUT indispensable pour la vérification de signature -- ne
  // jamais utiliser request.json() ici, qui reparse/reformate le JSON et
  // invaliderait la signature calculée par SendGrid sur les octets exacts
  // envoyés.
  const corpsBrut = await request.text();
  const signature = request.headers.get(EventWebhookHeader.SIGNATURE()) ?? "";
  const horodatage = request.headers.get(EventWebhookHeader.TIMESTAMP()) ?? "";

  let signatureValide: boolean;
  try {
    signatureValide = new EventWebhook().verifySignature(
      clePubliqueECDSA(), corpsBrut, signature, horodatage
    );
  } catch {
    signatureValide = false;
  }
  if (!signatureValide) {
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }

  let evenements: EvenementSendGrid[];
  try {
    evenements = JSON.parse(corpsBrut);
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Client anon, PAS service_role -- l'écriture passe par une fonction
  // SECURITY DEFINER dédiée (cf. migration 0017) qui ne sait faire qu'une
  // seule chose, pour ne jamais exposer une clé à privilèges larges dans
  // cette application publique.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  for (const evenement of evenements) {
    if (!evenement.event || !evenement.email) continue;
    await supabase.rpc("enregistrer_evenement_sendgrid", {
      p_evenement: evenement.event,
      p_email: evenement.email,
      p_sg_message_id: evenement.sg_message_id ?? null,
      p_produit: evenement.produit ?? null,
      p_type_notification: evenement.type_notification ?? null,
      p_reference_id: evenement.reference_id ?? null,
      p_raison: evenement.reason ?? evenement.response ?? null,
      p_horodatage: evenement.timestamp
        ? new Date(evenement.timestamp * 1000).toISOString()
        : new Date().toISOString(),
      p_brut: evenement,
    });
  }

  return NextResponse.json({ ok: true });
}
