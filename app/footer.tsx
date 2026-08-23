import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 px-6 py-8 text-xs text-muted">
      <Link href="/mentions-legales" className="hover:text-foreground hover:underline">
        Mentions légales
      </Link>
      <Link href="/cgu" className="hover:text-foreground hover:underline">
        CGU
      </Link>
      <Link href="/confidentialite" className="hover:text-foreground hover:underline">
        Confidentialité
      </Link>
    </footer>
  );
}
