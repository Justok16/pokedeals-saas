import type { Metadata, Viewport } from "next";
import { Bungee, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";
import Footer from "./footer";
import { NOMBRE_BOUTIQUES } from "@/lib/constantes";

const bungee = Bungee({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TITRE = "PokéDeals — Alertes automatiques sur les cartes Pokémon TCG";
const DESCRIPTION = `Configure ta watchlist de cartes Pokémon TCG et reçois une alerte dès qu'une bonne affaire tombe sous ton seuil de prix, sur eBay, Vinted et ${NOMBRE_BOUTIQUES} boutiques françaises et japonaises.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITRE,
    template: "%s — PokéDeals",
  },
  description: DESCRIPTION,
  keywords: [
    "Pokémon TCG",
    "cartes Pokémon",
    "bonnes affaires Pokémon",
    "alerte prix Pokémon",
    "watchlist cartes Pokémon",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PokéDeals",
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "Fn1oLeSvs2lTKx-uQUsGfvdYlr1ofxwgebYdhsrts9E",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "PokéDeals",
    title: TITRE,
    description: DESCRIPTION,
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "PokéDeals" }],
  },
  twitter: {
    card: "summary",
    title: TITRE,
    description: DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a0b2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${bungee.variable} ${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        {children}
        <Footer />
      </body>
    </html>
  );
}
