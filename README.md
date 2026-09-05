# PokéDeals — Dashboard SaaS

Application web (Next.js, App Router, Tailwind CSS, Supabase) qui permet à
chaque utilisateur de configurer sa propre **watchlist de cartes Pokémon
TCG** (nom, langue, seuil de prix) et de voir apparaître ses **bonnes
affaires détectées** au même endroit — sans jamais avoir à regarder du code
ou un canal Telegram partagé.

Repo séparé depuis le 22/08/2026 du bot de scraping historique
(**`justok16/pokedeals`**, public) — voir la section [Relation avec le
scraper](#relation-avec-le-scraper-justok16pokedeals) ci-dessous. 100%
gratuit et illimité pour tous les utilisateurs : aucune intégration de
paiement, aucune limite de cartes autre qu'un garde-fou anti-abus côté
serveur (cf. plus bas).

## 🧭 Ce que fait le dashboard

### Watchlist personnalisée
Chaque utilisateur ajoute autant de cartes qu'il veut (nom, langue parmi
FR/JP/EN/KR/CN, seuil de prix, notes libres). Modification et suppression en
place, aucun formulaire séparé. Chaque carte affiche aussi, quand elle est
connue, la **cote marché** calculée par le scraper (`market_cotes`), à côté
du seuil personnel de l'utilisateur.

### Mettre une carte en pause
Une carte peut être **mise en pause** sans être supprimée (bouton
"Mettre en pause" / "Réactiver") : son seuil et ses notes restent en base,
elle est juste exclue du matching côté scraper le temps qu'elle est en
pause (colonne `actif`, `watchlist_items`).

### Bonnes affaires détectées, avec badge de disponibilité
La section "Dernières bonnes affaires détectées" liste les correspondances
trouvées par le scraper entre une annonce réelle et la watchlist d'un
utilisateur (prix, titre, plateforme, lien direct, pourcentage sous la cote
marché ou sous le seuil personnel). Depuis le 03/09/2026, chaque alerte est
aussi **revérifiée périodiquement** par un radar dédié côté scraper
(`scraper/verification_alertes.py`, dépôt `pokedeals`, cron 30 min) : un
badge indique si l'annonce est toujours disponible (vert, avec le prix
revérifié s'il a changé) ou probablement vendue/indisponible (rouge). Cette
vérification couvre Shopify/PrestaShop/WooCommerce (fiable) ; eBay/Vinted/
Leboncoin restent hors périmètre en v1 (pas d'API fiable et gratuite pour
revérifier une annonce individuelle) — l'alerte n'affiche alors aucun badge,
plutôt qu'un statut deviné.

### Marquer une alerte comme traitée
Une alerte peut être marquée "traitée" (✓) une fois vue/décidée, ce qui la
retire de la vue par défaut sans la supprimer — un lien "Voir les alertes
traitées" la fait réapparaître, avec possibilité de la remarquer "non
traitée" (↺).

### Notifications push et email
- **Push navigateur** (Web Push / VAPID) : activable en un clic depuis le
  dashboard, fonctionne même onglet fermé. Vérifie que l'abonnement du
  navigateur appartient bien à l'utilisateur connecté (protection contre un
  appareil partagé où un autre compte serait resté abonné).
- **Email** (via [Resend](https://resend.com)) : activé par défaut, bascule
  simple depuis le dashboard.

Les deux canaux sont envoyés par le scraper (`scraper/notifications_saas.py`,
dépôt `pokedeals`), uniquement pour les alertes réellement nouvelles.

### Autres éléments du dashboard
- Statistiques en tête de page : cartes surveillées, bonnes affaires reçues,
  économies récentes estimées.
- Formulaire de feedback (limité à 20 envois/jour par utilisateur).
- Mise en avant du service sœur [PokéPrécoms](https://pokeprecoms.vercel.app)
  (précommandes de produits scellés Pokémon TCG).
- PWA installable (`public/sw.js`, `public/manifest` généré via
  `app/manifest.ts`, `app/register-sw.tsx`).
- Garde-fous anti-abus côté serveur : longueur max des champs texte, 500
  cartes max par utilisateur — ces Server Actions sont appelables
  directement (indépendamment des attributs `maxLength`/limites visuelles du
  formulaire), donc la vraie barrière est côté serveur.

## Relation avec le scraper (`justok16/pokedeals`)

Ce dashboard **n'effectue lui-même aucun scraping**. Toute la détection de
bonnes affaires (eBay, Vinted, Leboncoin, 110+ boutiques françaises et
japonaises spécialisées) reste dans le bot Python historique du dépôt public
`justok16/pokedeals`, qui tourne en continu via des cron GitHub Actions.
Trois ponts, tous optionnels et non bloquants côté scraper (absence de
secret = fonctionnalité désactivée, le reste du bot continue de tourner
normalement), relient les deux dépôts à la même base Supabase :

- `scraper/watchlist_saas.py` — étend la watchlist réellement scannée par le
  scraper avec les cartes ajoutées par les utilisateurs du dashboard, en
  plus de `config.yaml`.
- `scraper/connecteur_supabase.py` — compare chaque bonne affaire détectée
  aux watchlists personnelles (nom normalisé + langue + seuil) et écrit les
  correspondances dans `watchlist_alerts`, lue ici par RLS.
- `scraper/verification_alertes.py` — revérifie périodiquement la
  disponibilité/le prix des alertes déjà enregistrées (cf. badge ci-dessus).

Ce dépôt (`pokedeals-saas`) ne fait donc que **lire/écrire dans la même base
Supabase** que le scraper, avec des rôles strictement séparés par RLS :
l'utilisateur gère sa watchlist et ses préférences, le scraper (`service_role`)
est seul à pouvoir écrire dans `watchlist_alerts`.

## Stack technique

- **[Next.js](https://nextjs.org) 16** (App Router, Server Actions),
  **React 19**, **TypeScript**, **Tailwind CSS v4**.
- **[Supabase](https://supabase.com)** : Postgres, Auth (OAuth Google/GitHub),
  Row Level Security — pas d'API backend séparée, les Server Actions
  interrogent directement Supabase avec la session de l'utilisateur.
- **Web Push (VAPID)** pour les notifications navigateur, **Resend** pour
  l'email — tous deux pilotés côté scraper, pas ce dépôt.
- CI (`ci.yml`) : typecheck TypeScript (`tsc --noEmit`) + ESLint sur chaque
  push/PR ; pas de suite de tests dans ce dépôt. Analyse de sécurité CodeQL
  (`codeql.yml`) en plus.
- Déployé sur [Vercel](https://vercel.com).

## Mise en route

### 1. Créer le projet Supabase + appliquer le schéma

**Option automatique (recommandée)** — nécessite `jq` et un accès réseau
non restreint vers `api.supabase.com` (donc en local, pas depuis un
environnement sandboxé) :

```bash
# 1. Créer un compte sur https://supabase.com
# 2. Créer un jeton sur https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=sbp_xxxxx
./scripts/setup-supabase.sh
```

Le script crée le projet, applique toutes les migrations de
`supabase/migrations/` (schéma `watchlist_items` + `watchlist_alerts` + les
tables/colonnes ajoutées depuis, cf. liste ci-dessous), écrit `.env.local`
avec l'URL et la clé anonyme, et affiche à la fin les deux secrets à
ajouter côté GitHub Actions (dépôt `pokedeals`) pour connecter le scraper
(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`).

**Option manuelle** :

1. Créer un compte sur [supabase.com](https://supabase.com) et un nouveau projet.
2. Dans **Project Settings > API**, récupérer l'URL du projet et la clé `anon public`.
3. Copier `.env.example` vers `.env.local` et renseigner ces deux valeurs.
4. Dans le dashboard Supabase (**SQL Editor**), exécuter **dans l'ordre
   numérique** le contenu de chaque fichier de `supabase/migrations/`
   (`0001_...` jusqu'au fichier le plus récent). Il n'y a pas d'application
   automatique des migrations dans ce dépôt : toute nouvelle migration doit
   être exécutée manuellement dans le SQL editor par un mainteneur — c'est
   la convention suivie ici (cf. `AGENTS.md`).
5. Pour connecter le scraper : dans **Project Settings > API**, récupérer
   aussi la clé `service_role` (secrète), puis l'ajouter avec l'URL du
   projet comme secrets `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` sur le
   dépôt GitHub **`justok16/pokedeals`** (**Settings > Secrets and variables
   > Actions**). Sans ces secrets, le scraper continue de fonctionner
   normalement (fonctionnalité optionnelle, cf. `connecteur_supabase.py`
   dans le repo du scraper) — les utilisateurs ne verront simplement aucune
   alerte apparaître dans leur dashboard.

### 2. Configurer les fournisseurs OAuth (Google + GitHub)

Dans le dashboard Supabase, **Authentication > Providers** :

- **Google** : créer des identifiants OAuth 2.0 dans
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
  avec comme URI de redirection autorisée celle indiquée par Supabase
  (`https://<projet>.supabase.co/auth/v1/callback`). Renseigner le Client ID
  et le Client Secret dans Supabase.
- **GitHub** : créer une OAuth App dans
  [GitHub Developer Settings](https://github.com/settings/developers), même
  URI de callback. Renseigner le Client ID et le Client Secret dans Supabase.

Dans **Authentication > URL Configuration**, ajouter l'URL du site (en local :
`http://localhost:3000`, en prod : l'URL Vercel) à la liste des Redirect URLs.

### 3. Notifications (push + email) — optionnel

Chaque canal est indépendant et entièrement optionnel : sans sa config, ce
canal est simplement désactivé (cf. `notifications_saas.py` dans le repo du
scraper), le reste de l'app fonctionne normalement.

**Push navigateur** — aucun compte externe requis, juste une paire de clés
VAPID auto-générées :

```bash
python3 -m venv /tmp/vapidenv && /tmp/vapidenv/bin/pip install -q py-vapid
/tmp/vapidenv/bin/python -c "
from py_vapid import Vapid02
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption
import base64
v = Vapid02(); v.generate_keys()
b64url = lambda b: base64.urlsafe_b64encode(b).rstrip(b'=').decode()
print('VAPID_PUBLIC_KEY=' + b64url(v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)))
print('VAPID_PRIVATE_KEY=' + b64url(v.private_key.private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())))
"
rm -rf /tmp/vapidenv
```

- `VAPID_PUBLIC_KEY` → variable `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (`.env.local` + réglages Vercel)
- `VAPID_PRIVATE_KEY` → secret GitHub Actions `VAPID_PRIVATE_KEY` (dépôt `pokedeals`)
- Ajouter aussi le secret GitHub Actions `VAPID_CLAIM_EMAIL` (une adresse email de contact, requise par le protocole Web Push — n'importe quelle adresse valide convient)

**Email** — nécessite un compte [SendGrid](https://sendgrid.com) (gratuit
jusqu'à 100 emails/jour). Migré de Resend le 04/09/2026 (le compte Resend
tournait en mode sandbox sans domaine vérifié — voir `CLAUDE.md` du dépôt
`pokedeals` pour le détail) :

1. Créer un compte, vérifier un expéditeur (**Settings > Sender
   Authentication > Single Sender Verification**, gratuit, sans nom de
   domaine)
2. Récupérer une clé API (**Settings > API Keys**)
3. Ajouter les secrets GitHub Actions `SENDGRID_API_KEY` et
   `SENDGRID_FROM_EMAIL` (l'adresse d'envoi vérifiée à l'étape 1, ex:
   `PokéDeals <alertes@tondomaine.com>`) sur le dépôt `pokedeals`

PokéDeals est 100% gratuit et illimité pour tous les utilisateurs — aucune
intégration de paiement n'est nécessaire.

**Webhook de livraison SendGrid (recommandé, 05/09/2026)** — sans lui, le
seul signal disponible est "l'appel API a été accepté", pas "l'email a
réellement été livré" (exactement l'angle mort du bug Resend). Active la
vérification réelle :

1. Dans SendGrid, **Settings > Mail Settings > Event Webhook**
2. Activer **Signed Event Webhook**, renseigner l'URL
   `https://<ton-domaine>/api/webhooks/sendgrid`
3. Cocher au minimum *Delivered*, *Bounced*, *Dropped*, *Spam Report*,
   *Blocked*
4. Copier la **Verification Key** affichée → variable Vercel
   `SENDGRID_WEBHOOK_PUBLIC_KEY` (pas besoin des `-----BEGIN/END-----`, la
   route les rajoute elle-même si absents)

Sans ce secret : la route refuse toute requête (503), aucune conséquence
sur le reste de l'app — les emails continuent d'être envoyés normalement,
seule cette vérification supplémentaire reste inactive.

### 4. Lancer en local

```bash
npm install
npm run dev
```

## Structure

- `app/page.tsx` — landing page
- `app/login/` — connexion OAuth (Google/GitHub)
- `app/auth/callback/` — échange du code OAuth contre une session
- `app/dashboard/page.tsx` — watchlist protégée (liste, ajout, modification,
  pause, suppression) + dernières alertes détectées (avec badge de
  disponibilité et pourcentage sous la cote/le seuil) + notifications
  (push/email) + feedback, illimité et gratuit pour tous
- `app/dashboard/actions.ts` — Server Actions (CRUD watchlist, pause carte,
  alerte traitée, abonnement push, préférence email, feedback), avec leurs
  propres garde-fous anti-abus (longueur des champs, nombre de cartes,
  fréquence de feedback) — cf. commentaires en tête de fichier
- `app/dashboard/notif-push.tsx` — activation/désactivation des
  notifications push côté client (bannière + réglages)
- `app/api/webhooks/sendgrid/route.ts` — réception et vérification (ECDSA)
  des événements de livraison réels SendGrid (delivered/bounce/...), cf.
  section notifications ci-dessus
- `lib/supabase/` — clients Supabase (browser, server, middleware)
- `proxy.ts` — rafraîchissement de session + protection de `/dashboard`
- `supabase/migrations/` — schéma SQL (`watchlist_items`, `watchlist_alerts`,
  `push_subscriptions`, `user_preferences`, `market_cotes`, `feedback`,
  `sendgrid_evenements`, policies RLS ; `subscriptions` est un vestige non
  utilisé depuis le passage au tout-gratuit) — appliqué manuellement, cf.
  étape 1 ci-dessus
- `scripts/setup-supabase.sh` — provisionne le projet Supabase et applique le schéma via l'API (à lancer en local)

## Déploiement

Prévu pour [Vercel](https://vercel.com) : connecter le repo, et renseigner
les variables d'environnement `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` /
`NEXT_PUBLIC_SITE_URL` dans les réglages du projet Vercel, et optionnellement
`SENDGRID_WEBHOOK_PUBLIC_KEY` (cf. section notifications ci-dessus).
