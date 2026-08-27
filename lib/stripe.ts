import Stripe from "stripe";

// Client Stripe, cote SERVEUR uniquement (STRIPE_SECRET_KEY n'est jamais
// prefixee NEXT_PUBLIC_, jamais exposee au navigateur). Instanciation
// PARESSEUSE (pas un `export const` evalue au chargement du module) --
// Next.js collecte la config des Route Handlers (app/api/**) au BUILD, un
// throw immediat dans le constructeur Stripe (cf. `new Stripe(undefined)`)
// casserait `next build` meme sans jamais servir la route. Meme piege que
// les clients Supabase (cf. lib/supabase/*.ts), qui sont deja des fonctions
// pour la meme raison.
export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Niveau gratuit : nombre de cartes surveillables sans abonnement actif.
export const LIMITE_CARTES_GRATUIT = 3;

// Nouvelle tarification (decidee avec Justok le 27/08/2026, remplace
// l'ancienne offre fondateur 200 places/4,99-7,99€) : tarif solo unique
// pour les deux apps, avec un geste commercial symetrique si l'autre est
// deja active.
export const PRIX_SOLO = 2.99;

// Coupon "bundle" (cree a la main dans le dashboard Stripe, MEME COMPTE
// que pokeprecoms -- cf. determinerCouponBundle ci-dessous et son
// equivalent dans pokeprecoms/lib/stripe.ts) : -1,00€ off, ramene le
// second abonnement (quel qu'il soit) de 2,99€ a 1,99€/mois. Un seul
// coupon partage, reutilisable dans les DEUX sens (PokeDeals en second
// comme PokePrecoms en second) puisque le montant du geste commercial est
// identique des deux cotes -- pas besoin d'un coupon distinct par app.
export const BUNDLE_DISCOUNT_COUPON_ID = "bundle-app-jumelee";

// ID du Price Stripe de l'abonnement PokePrecoms (meme compte Stripe) --
// necessaire pour detecter si un client a deja PokePrecoms actif au moment
// du checkout PokeDeals. A renseigner en variable d'env une fois connu
// (cf. STRIPE_PRICE_ID dans pokeprecoms/.env -- meme valeur ici, prefixee
// POKEPRECOMS_ pour la distinguer du Price propre a PokeDeals).
const POKEPRECOMS_PRICE_ID = process.env.POKEPRECOMS_STRIPE_PRICE_ID;

// Testeurs beta : acces complet (cartes illimitees) sans passer par Stripe,
// via liste d'emails en variable d'env (BETA_TESTER_EMAILS, separes par
// virgules). Aucun paiement, aucun abonnement Stripe cree pour ces comptes.
export function estTesteurBeta(email: string | null | undefined) {
  if (!email) return false;
  const liste = (process.env.BETA_TESTER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return liste.includes(email.toLowerCase());
}

/**
 * Determine si le coupon bundle doit s'appliquer au checkout PokeDeals pour
 * cet email, en cherchant un abonnement PokePrecoms actif deja existant
 * pour le MEME client Stripe (meme compte Stripe partage entre les deux
 * apps, une recherche directe par email suffit).
 *
 * Symetrique de `determinerCouponBundle` dans pokeprecoms/lib/stripe.ts --
 * les deux verifient juste l'abonnement de l'AUTRE app, avec le meme
 * coupon (BUNDLE_DISCOUNT_COUPON_ID) puisque le geste commercial est
 * identique dans les deux sens (2,99€ -> 1,99€).
 *
 * Toute erreur reseau/API Stripe retombe sur `null` (tarif plein, 2,99€) --
 * ne doit jamais bloquer un checkout PokeDeals, meme si la verification du
 * bundle echoue.
 */
export async function determinerCouponBundle(
  stripe: Stripe,
  email: string
): Promise<string | null> {
  if (!POKEPRECOMS_PRICE_ID) return null;
  try {
    const customers = await stripe.customers.list({ email, limit: 5 });
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
      });
      const aLAbonnementPokeprecoms = subscriptions.data.some((sub) =>
        sub.items.data.some((item) => item.price.id === POKEPRECOMS_PRICE_ID)
      );
      if (aLAbonnementPokeprecoms) return BUNDLE_DISCOUNT_COUPON_ID;
    }
  } catch {
    // Erreur API Stripe -- tarif plein par prudence, ne bloque jamais le checkout.
  }
  return null;
}
