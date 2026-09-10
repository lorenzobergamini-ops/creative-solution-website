/**
 * Home — placeholder di base (Fase "fondamenta").
 * Le pagine di contenuto arriveranno nelle fasi successive (M1+).
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted">
        Stampa 3D e contenuti maker
      </p>
      <h1 className="font-display text-5xl font-bold text-accent md:text-6xl">
        Creative Solution
      </h1>
      <p className="max-w-md text-muted">Sito in costruzione.</p>
    </main>
  );
}