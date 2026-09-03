const PANNEAU = "rounded-2xl bg-surface p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]";
const BLOC = "animate-pulse rounded-md bg-surface-hover";

// Skeleton de chargement pour /dashboard (03/09/2026) : la page fait
// plusieurs allers-retours Supabase (dont un séquentiel, `cotesMarche`, qui
// dépend du résultat des requêtes précédentes) avant de pouvoir rendre quoi
// que ce soit -- sans ce fichier, Next.js affiche un onglet vide pendant ce
// temps. Reprend les mêmes classes (`PANNEAU`, couleurs `surface`/`accent`)
// que app/dashboard/page.tsx pour rester visuellement cohérent.
export default function DashboardLoading() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]"
      />

      <main
        aria-busy="true"
        aria-live="polite"
        className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12"
      >
        <span className="sr-only">Chargement du tableau de bord…</span>

        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className={`${BLOC} h-7 w-40`} />
            <div className={`${BLOC} h-4 w-28`} />
          </div>
          <div className={`${BLOC} h-4 w-24`} />
        </header>

        <section className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={PANNEAU}>
              <div className={`${BLOC} h-3 w-20`} />
              <div className={`${BLOC} mt-2 h-7 w-14`} />
            </div>
          ))}
        </section>

        <div className={`${BLOC} h-4 w-2/3 self-center`} />

        <section className={PANNEAU}>
          <div className={`${BLOC} h-4 w-32`} />
          <div className={`${BLOC} mt-4 h-9 w-full`} />
        </section>

        <section className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-surface-hover" />
              <div className="flex-1 space-y-2">
                <div className={`${BLOC} h-4 w-1/2`} />
                <div className={`${BLOC} h-3 w-1/3`} />
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <div className={`${BLOC} h-4 w-56`} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
              <div className="space-y-2">
                <div className={`${BLOC} h-4 w-40`} />
                <div className={`${BLOC} h-3 w-24`} />
              </div>
              <div className={`${BLOC} h-6 w-16`} />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
