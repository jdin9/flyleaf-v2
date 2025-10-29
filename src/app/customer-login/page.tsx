import Link from "next/link";

export default function CustomerLoginPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-8 px-6 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-muted">Customer</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Customer login coming soon</h1>
          <p className="text-lg text-muted">
            We&rsquo;re building a secure sign-in so readers can access their Flyleaf library and track active orders.
          </p>
        </div>
        <div className="mx-auto w-full max-w-md space-y-4 rounded-3xl border border-border bg-panel/70 p-8 text-center shadow-sm backdrop-blur">
          <button
            type="button"
            disabled
            aria-disabled={true}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-foreground px-4 py-3 text-sm font-semibold uppercase tracking-wide text-background opacity-60 cursor-not-allowed"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-semibold text-foreground">
              G
            </span>
            Sign in with Google
          </button>
          <button
            type="button"
            disabled
            aria-disabled={true}
            className="w-full rounded-full border border-border px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground opacity-60 cursor-not-allowed"
          >
            Continue to customer hub
          </button>
          <p className="text-sm text-muted">
            Customer accounts are on the way. We&rsquo;ll notify you as soon as the login experience is ready.
          </p>
        </div>
        <div className="text-center text-sm text-muted">
          <Link href="/" className="font-medium text-foreground transition hover:opacity-80">
            Return to home
          </Link>
        </div>
      </section>
    </main>
  );
}
