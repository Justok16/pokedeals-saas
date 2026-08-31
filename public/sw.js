// Service worker minimal, écrit à la main (pas de next-pwa/workbox — Turbopack
// n'est pas compatible avec leur plugin webpack). Deux strategies seulement :
// - navigations (pages HTML) : reseau d'abord, repli offline.html si hors ligne.
// - assets statiques (_next/static, /icons) : cache d'abord, mise a jour en fond.
// Rien d'autre n'est mis en cache : pas d'API, pas de donnees dynamiques.

const CACHE_VERSION = "v1";
const STATIC_CACHE = `pokedeals-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pokedeals-static-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

// Notifications push (scraper/notifications_saas.py) : payload JSON
// {title, body, url}. Toute erreur de parsing retombe sur un texte
// generique -- jamais d'echec silencieux de la notification elle-meme.
self.addEventListener("push", (event) => {
  let payload = { title: "PokéDeals", body: "Nouvelle alerte disponible." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // payload non-JSON ignoré, on garde le texte générique
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        const existant = clientsArr.find((c) => c.url.includes(url));
        if (existant) return existant.focus();
        return self.clients.openWindow(url);
      })
  );
});

// Correctif du 31/08/2026 (signalé par l'utilisateur : "j'ai l'impression
// de devoir réactiver les notifications à chaque connexion") : les
// navigateurs font tourner périodiquement l'endpoint d'un abonnement push
// (rotation de clé côté service de push, ex. FCM) et déclenchent
// pushsubscriptionchange -- SANS ce gestionnaire, le navigateur créait un
// nouvel abonnement en interne mais rien ne le renvoyait au serveur, qui
// gardait le VIEIL endpoint (devenu invalide). Avant le correctif du
// 30/08/2026 sur la vérification de propriétaire (app/dashboard/
// notif-push.tsx), ceci restait invisible : getSubscription() renvoyait le
// nouvel abonnement navigateur, affichant "actif" à tort, alors que le
// serveur n'envoyait plus jamais rien à cet utilisateur -- un vrai risque
// de perte silencieuse de notifications qui expliquait potentiellement
// certaines alertes jamais reçues. Ce gestionnaire re-souscrit
// immédiatement et renvoie le nouvel abonnement au serveur, sans jamais
// nécessiter que l'utilisateur reclique sur "Activer".
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const reponse = await fetch("/api/push/vapid-public-key");
        const { publicKey } = await reponse.json();
        if (!publicKey) return;

        const nouvelAbonnement = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const json = nouvelAbonnement.toJSON();
        await fetch("/api/push/resubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
      } catch (error) {
        console.error("Échec de la re-souscription push après rotation d'endpoint", error);
      }
    })()
  );
});

// Dupliqué depuis app/dashboard/notif-push.tsx -- le service worker est un
// script autonome (pas de bundler compatible Turbopack, cf. en-tête de ce
// fichier), impossible d'importer une fonction applicative ici.
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Safe);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
