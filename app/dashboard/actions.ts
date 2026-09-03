"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LANGUES_VALIDES = ["fr", "jp", "en", "kr", "cn"] as const;

// Audit externe du 30/08/2026 : aucune limite cote serveur sur la longueur
// des champs texte ni le nombre de cartes par utilisateur -- une Server
// Action est appelable directement (contourne les attributs maxLength/
// limites visuelles du formulaire), donc la seule vraie barriere est cote
// serveur. Valeurs choisies larges (jamais genantes pour un usage normal,
// le service reste "100% gratuit et illimite" affiche sur le dashboard) --
// uniquement pour eviter un abus grossier (spam, explosion du volume de
// matching cote scraper).
const MAX_LONGUEUR_NOM_CARTE = 200;
const MAX_LONGUEUR_NOTES = 500;
const MAX_CARTES_PAR_UTILISATEUR = 500;
// Audit externe du 03/09/2026 : envoyerFeedback n'avait aucune limite de
// frequence, contrairement a ajouterCarte (MAX_CARTES_PAR_UTILISATEUR
// ci-dessus) -- une Server Action est appelable directement (independamment
// de toute limite visuelle du formulaire), donc un envoi repete en boucle
// pouvait spammer sans aucun frein serveur. Valeur large (jamais genante
// pour un vrai retour utilisateur) -- uniquement pour eviter un abus
// grossier. Necessite une policy select dediee sur `feedback` (migration
// 0015_feedback_select_own.sql) pour pouvoir compter ses propres envois.
const MAX_FEEDBACK_PAR_JOUR = 20;

export async function ajouterCarte(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nomCarte = String(formData.get("nom_carte") ?? "").trim();
  const langue = String(formData.get("langue") ?? "fr");
  const prixSeuilBrut = String(formData.get("prix_seuil") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const prixSeuil = Number(prixSeuilBrut.replace(",", "."));

  if (!nomCarte) {
    throw new Error("Le nom de la carte est requis.");
  }
  if (nomCarte.length > MAX_LONGUEUR_NOM_CARTE) {
    throw new Error(`Le nom de la carte est trop long (${MAX_LONGUEUR_NOM_CARTE} caractères maximum).`);
  }
  if (notes && notes.length > MAX_LONGUEUR_NOTES) {
    throw new Error(`Les notes sont trop longues (${MAX_LONGUEUR_NOTES} caractères maximum).`);
  }
  if (!Number.isFinite(prixSeuil) || prixSeuil < 0) {
    throw new Error("Le seuil de prix doit être un nombre positif.");
  }
  if (!LANGUES_VALIDES.includes(langue as (typeof LANGUES_VALIDES)[number])) {
    throw new Error("Langue invalide.");
  }

  const { count } = await supabase
    .from("watchlist_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_CARTES_PAR_UTILISATEUR) {
    throw new Error(
      `Limite de ${MAX_CARTES_PAR_UTILISATEUR} cartes surveillées atteinte -- retire-en une avant d'en ajouter une nouvelle.`
    );
  }

  const { error } = await supabase.from("watchlist_items").insert({
    user_id: user.id,
    nom_carte: nomCarte,
    langue,
    prix_seuil: prixSeuil,
    notes,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function modifierCarte(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const nomCarte = String(formData.get("nom_carte") ?? "").trim();
  const langue = String(formData.get("langue") ?? "fr");
  const prixSeuilBrut = String(formData.get("prix_seuil") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const prixSeuil = Number(prixSeuilBrut.replace(",", "."));

  if (!id) return;
  if (!nomCarte) {
    throw new Error("Le nom de la carte est requis.");
  }
  if (nomCarte.length > MAX_LONGUEUR_NOM_CARTE) {
    throw new Error(`Le nom de la carte est trop long (${MAX_LONGUEUR_NOM_CARTE} caractères maximum).`);
  }
  if (notes && notes.length > MAX_LONGUEUR_NOTES) {
    throw new Error(`Les notes sont trop longues (${MAX_LONGUEUR_NOTES} caractères maximum).`);
  }
  if (!Number.isFinite(prixSeuil) || prixSeuil < 0) {
    throw new Error("Le seuil de prix doit être un nombre positif.");
  }
  if (!LANGUES_VALIDES.includes(langue as (typeof LANGUES_VALIDES)[number])) {
    throw new Error("Langue invalide.");
  }

  // RLS s'assure déjà qu'un utilisateur ne peut modifier que ses propres
  // lignes -- le filtre user_id ici est une défense en profondeur.
  const { error } = await supabase
    .from("watchlist_items")
    .update({ nom_carte: nomCarte, langue, prix_seuil: prixSeuil, notes })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function supprimerCarte(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // RLS s'assure déjà qu'un utilisateur ne peut supprimer que ses propres
  // lignes -- le filtre user_id ici est une défense en profondeur, pas la
  // seule barrière.
  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

type SubscriptionPushJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function enregistrerAbonnementPush(subscription: SubscriptionPushJSON) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("Abonnement push invalide.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw new Error(error.message);
}

export async function supprimerAbonnementPush(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
}

// Audit du 30/08/2026 : la vérification "notifications actives ?" côté
// client se basait UNIQUEMENT sur navigator.serviceWorker.pushManager.
// getSubscription() (état du navigateur), jamais recroisée avec le
// propriétaire réel en base -- sur un appareil partagé, si l'utilisateur A
// active le push puis se déconnecte sans cliquer "Désactiver", B qui se
// connecte ensuite sur le même appareil voit l'UI afficher "actif" à tort
// (l'abonnement navigateur de A existe toujours) : B ne reçoit jamais ses
// propres notifications, et A continue de recevoir les siennes sur un
// appareil dont il ne s'est plus servi. Cette action permet au client de
// vérifier que l'endpoint appartient bien à l'utilisateur CONNECTÉ avant
// d'afficher "actif" -- sinon l'appelant doit désabonner le navigateur.
export async function abonnementPushAppartientAUtilisateur(endpoint: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  return data?.user_id === user.id;
}

export async function basculerNotifEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = formData.get("notif_email") === "on";

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, notif_email: active }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard?notifications=enregistre");
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function envoyerFeedback(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    throw new Error("Le message ne peut pas être vide.");
  }
  if (message.length > 2000) {
    throw new Error("Le message est trop long (2000 caractères maximum).");
  }

  const depuis24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", depuis24h);
  if ((count ?? 0) >= MAX_FEEDBACK_PAR_JOUR) {
    throw new Error(
      `Limite de ${MAX_FEEDBACK_PAR_JOUR} messages par jour atteinte -- réessaie demain.`
    );
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    message,
  });
  if (error) {
    throw new Error(`Erreur lors de l'envoi : ${error.message}`);
  }

  redirect("/dashboard?feedback=envoye");
}

// Demande explicite de Justok (03/09/2026) : "mettre en pause" une carte
// surveillee sans la supprimer (cf. migration 0013_watchlist_items_actif.sql).
// La nouvelle valeur est fournie directement par le bouton cliquant (name/
// value du <button>, cf. app/dashboard/page.tsx) -- pas besoin d'une
// lecture prealable pour connaitre l'etat courant a inverser.
export async function toggleActifCarte(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const actif = formData.get("actif") === "true";
  if (!id) return;

  // RLS s'assure déjà qu'un utilisateur ne peut modifier que ses propres
  // lignes -- le filtre user_id ici est une défense en profondeur.
  const { error } = await supabase
    .from("watchlist_items")
    .update({ actif })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

// Demande explicite de Justok (03/09/2026) : marquer une alerte comme
// "traitee" (vue/decidee) sans la supprimer, pour l'exclure de la liste par
// defaut (cf. migration 0014_watchlist_alerts_traitee.sql). Cette action ne
// touche QUE la colonne `traitee_par_utilisateur` -- c'est la seule que le
// GRANT UPDATE de la migration autorise pour un utilisateur authentifie,
// toutes les autres colonnes de watchlist_alerts restant reservees au
// scraper (service_role). Meme mecanisme bouton name/value que
// toggleActifCarte ci-dessus : permet aussi de "reactiver" une alerte
// (marquer comme non traitee) depuis la vue "alertes traitées".
export async function definirAlerteTraitee(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const traitee = formData.get("traitee") === "true";
  if (!id) return;

  // RLS + GRANT colonne s'assurent déjà qu'un utilisateur ne peut modifier
  // que `traitee_par_utilisateur` sur ses propres lignes -- le filtre
  // user_id ici est une défense en profondeur.
  const { error } = await supabase
    .from("watchlist_alerts")
    .update({ traitee_par_utilisateur: traitee })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
