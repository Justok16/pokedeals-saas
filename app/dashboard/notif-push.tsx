"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { enregistrerAbonnementPush, supprimerAbonnementPush } from "./actions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Safe);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// "verification" = statut pas encore connu (avant la résolution de la
// promesse pushManager.getSubscription()) -- distinct de "inactif" pour ne
// jamais afficher la bannière/le bouton "Activer" avant d'être sûr que
// l'utilisateur n'est pas déjà abonné.
type Etat = "verification" | "indisponible" | "inactif" | "actif" | "en_cours" | "refuse";

const CLE_BANNIERE_MASQUEE_LE = "pokedeals_push_banniere_masquee_le";
// Le bouton "Plus tard" ne masque la bannière que temporairement -- sinon un
// utilisateur qui clique dessus une fois ne serait plus jamais reproposé
// l'activation, même des semaines après avoir ajouté plus de cartes.
const DUREE_MASQUAGE_MS = 14 * 24 * 60 * 60 * 1000;

// Store partagé au niveau du module : le composant est monté deux fois sur
// le dashboard (bannière + réglages), chacune avec son propre etat React
// local causerait un désync (ex. activer via la bannière ne mettait pas à
// jour le lien des réglages, qui restait "Activer" jusqu'au rechargement).
// useSyncExternalStore permet à toutes les instances de partager le même
// état sans avoir à faire remonter un Provider dans page.tsx.
let etatStore: Etat = "verification";
let erreurStore: string | null = null;
const listeners = new Set<() => void>();

function notifier() {
  listeners.forEach((l) => l());
}
function definirEtat(e: Etat) {
  etatStore = e;
  notifier();
}
function definirErreur(e: string | null) {
  erreurStore = e;
  notifier();
}
function abonner(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let verificationLancee = false;
function lancerVerificationInitiale() {
  if (verificationLancee) return;
  verificationLancee = true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    definirEtat("indisponible");
    return;
  }
  if (Notification.permission === "denied") {
    definirEtat("refuse");
    return;
  }
  navigator.serviceWorker.ready.then(async (registration) => {
    const subscription = await registration.pushManager.getSubscription();
    definirEtat(subscription ? "actif" : "inactif");
  });
}

async function activer() {
  definirErreur(null);
  definirEtat("en_cours");
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      definirEtat("refuse");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error("Clé VAPID non configurée côté serveur.");

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subscriptionJSON = subscription.toJSON();
    if (!subscriptionJSON.endpoint) {
      throw new Error("Abonnement push sans endpoint.");
    }
    await enregistrerAbonnementPush({
      endpoint: subscriptionJSON.endpoint,
      keys: subscriptionJSON.keys,
    });
    definirEtat("actif");
  } catch (e) {
    definirErreur(e instanceof Error ? e.message : "Échec de l'activation.");
    definirEtat("inactif");
  }
}

async function desactiver() {
  definirErreur(null);
  definirEtat("en_cours");
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await supprimerAbonnementPush(subscription.endpoint);
      await subscription.unsubscribe();
    }
    definirEtat("inactif");
  } catch (e) {
    definirErreur(e instanceof Error ? e.message : "Échec de la désactivation.");
    definirEtat("actif");
  }
}

export default function NotifPush({
  banniere = false,
}: {
  /** true = bannière contextuelle proposée après l'ajout d'une carte, false = simple lien dans les réglages. */
  banniere?: boolean;
}) {
  const etat = useSyncExternalStore(
    abonner,
    () => etatStore,
    () => "verification" as Etat
  );
  const erreur = useSyncExternalStore(
    abonner,
    () => erreurStore,
    () => null
  );

  useEffect(() => {
    lancerVerificationInitiale();
  }, []);

  // Local (pas dans le store partagé) : la bannière n'est jamais montée
  // qu'une seule fois à la fois (cf. page.tsx), pas besoin de synchroniser
  // ce masquage entre plusieurs instances.
  const [masquee, setMasquee] = useState(() => {
    if (!banniere) return false;
    try {
      return Date.now() < Number(localStorage.getItem(CLE_BANNIERE_MASQUEE_LE) ?? "0");
    } catch {
      return false;
    }
  });

  function masquer() {
    try {
      localStorage.setItem(CLE_BANNIERE_MASQUEE_LE, String(Date.now() + DUREE_MASQUAGE_MS));
    } catch {
      // localStorage indisponible (navigation privée...) -- la bannière
      // réapparaîtra à la prochaine visite, sans conséquence bloquante.
    }
    setMasquee(true);
  }

  if (etat === "verification" || etat === "indisponible") {
    return banniere || etat === "verification" ? null : (
      <p className="text-xs text-muted">
        Notifications push non supportées sur ce navigateur.
      </p>
    );
  }

  if (banniere) {
    if (masquee || (etat !== "inactif" && etat !== "en_cours")) return null;
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-5 ring-1 ring-accent/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ne rate aucune alerte
          </p>
          <p className="mt-1 text-xs text-muted">
            Active les notifications push pour être prévenu dès qu&apos;une bonne affaire tombe
            sous ton seuil, même onglet fermé.
          </p>
          {erreur && <p className="mt-1 text-xs text-danger">{erreur}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={masquer} className="text-xs text-muted hover:text-foreground">
            Plus tard
          </button>
          <button
            type="button"
            onClick={activer}
            disabled={etat === "en_cours"}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            Activer les notifications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {etat === "actif" ? (
        <button
          type="button"
          onClick={desactiver}
          className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Désactiver les notifications push
        </button>
      ) : (
        <button
          type="button"
          onClick={activer}
          disabled={etat === "en_cours"}
          className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          {etat === "refuse"
            ? "Notifications bloquées — autorise-les dans les réglages du navigateur"
            : "Activer les notifications push"}
        </button>
      )}
      {erreur && <span className="text-xs text-danger">{erreur}</span>}
    </div>
  );
}
