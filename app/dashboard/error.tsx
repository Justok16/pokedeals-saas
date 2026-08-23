"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">Une erreur est survenue</p>
      <p className="text-sm text-muted">{error.message || "Réessaie dans quelques instants."}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110"
      >
        Réessayer
      </button>
    </main>
  );
}
