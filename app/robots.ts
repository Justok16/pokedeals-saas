import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Pas d'intérêt à indexer les pages nécessitant une connexion ou les
      // routes techniques (API, callback OAuth) -- évite de gaspiller le
      // budget de crawl des moteurs de recherche sur des pages vides pour
      // un visiteur non connecté.
      disallow: ["/dashboard", "/api/", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
