import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex h-[80vh] max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.35em] text-muted">Flyleaf</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            Custom dust jackets without the design software.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">
            Build, preview, and export professional book covers with live controls for dimensions,
            artwork, and print-ready outputs.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/designer"
            className="rounded-full bg-foreground px-8 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Open the designer
          </Link>
          <p className="text-sm text-muted">
            Decisions and implementation notes live in <code className="rounded bg-foreground/10 px-2 py-1">docs/decisions.md</code>.
          </p>
        </div>
      </section>
    </main>
  );
}
