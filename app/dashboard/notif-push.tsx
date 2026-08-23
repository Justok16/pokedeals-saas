"use client";

import { useEffect, useState } from "react";
import { enregistrerAbonnementPush, supprimerAbonnementPush } from "./actions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Safe);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Etat = "indisponible" | "inactif" | "actif" | "en_cours" | "refuse";

const CLE_BANNIERE_MASQUEE = "pokedeals_push_banniere_masquee";

export default function NotifPush({
  banniere = false,
}: {
  /** true = bannière contextuelle proposée après l'ajout d'une carte, false = simple lien dans les réglages. */
  banniere?: boolean;
}) {
  const [etat, setEtat] = useState<Etat>("inactif");
  const [erreur, setErreur] = useState<string | null>(null);
  const [masquee, setMasquee] = useState(true);

  useEffect(() => {
    if (banniere) {
      try {
        setMasquee(localStorage.getItem(CLE_BANNIERE_MASQUEE) === "1");
      } catch {
        setMasquee(false);
      }
    }
  }, [banniere]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEtat("indisponible");
      return;
    }
    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setEtat(subscription ? "actif" : "inactif");
    });
  }, []);

  async function activer() {
    setErreur(null);
    setEtat("en_cours");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat("refuse");
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
      setEtat("actif");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Échec de l'activation.");
      setEtat("inactif");
    }
  }

  function masquer() {
    try {
      localStorage.setItem(CLE_BANNIERE_MASQUEE, "1");
    } catch {
      // localStorage indisponible (navigation privée...) -- la bannière
      // réapparaîtra à la prochaine visite, sans conséquence bloquante.
    }
    setMasquee(true);
  }

  async function desactiver() {
    setErreur(null);
    setEtat("en_cours");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supprimerAbonnementPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEtat("inactif");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Échec de la désactivation.");
      setEtat("actif");
    }
  }

  if (etat === "indisponible") {
    return banniere ? null : (
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
