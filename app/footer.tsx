import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 px-6 py-8 text-xs text-muted">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link href="/mentions-legales" className="hover:text-foreground hover:underline">
          Mentions légales
        </Link>
        <Link href="/cgu" className="hover:text-foreground hover:underline">
          CGU
        </Link>
        <Link href="/confidentialite" className="hover:text-foreground hover:underline">
          Confidentialité
        </Link>
      </div>
      <p className="text-center text-[11px] text-muted/70">
        PokéDeals est un service indépendant, non affilié à Nintendo, The Pokémon Company, Game
        Freak, eBay ou Vinted.
      </p>
    </footer>
  );
}
