import fs from "node:fs/promises";
import path from "node:path";

import Image from "next/image";
import Link from "next/link";

type Listing = {
  id: string;
  imagePath: string;
  title: string;
};

async function getListings(): Promise<Listing[]> {
  const listingsDirectory = path.join(process.cwd(), "public", "listings");

  try {
    const entries = await fs.readdir(listingsDirectory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      .map((entry) => {
        const { name } = entry;
        const parsed = path.parse(name);
        const title = parsed.name
          .replace(/[-_]+/g, " ")
          .split(" ")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

        return {
          id: name,
          imagePath: `/listings/${name}`,
          title: title || parsed.name,
        } satisfies Listing;
      });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export default async function Home() {
  const listings = await getListings();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/seller-portal"
              className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wide text-background transition hover:opacity-90"
            >
              Seller Portal
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-foreground/40"
            >
              Admin Portal
            </Link>
            <Link
              href="/customer-login"
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-foreground/40"
            >
              Customer Login
            </Link>
          </div>
          <div className="w-full space-y-6 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-muted">Flyleaf</p>
            <h1 className="text-4xl font-semibold sm:text-5xl">Judge every book by its cover.</h1>
            <p className="text-lg text-muted">
              Bring your shelves to life with dust jackets that make every spine a showpiece before the first page turns.
            </p>
            <div className="flex flex-col items-center gap-2 text-center">
              <Link
                href="/designer"
                className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-xs font-semibold uppercase tracking-wide text-background transition hover:opacity-90"
              >
                Upload your own Design
              </Link>
              <p className="text-sm text-muted">Drop your listings in the folder below to showcase them here.</p>
            </div>
          </div>
        </div>
        <div className="flex-1">
          {listings.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted">
              Add images to <span className="mx-2 font-semibold text-foreground">public/listings</span> to display them on the home page.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-panel/70 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border/50">
                    <Image src={listing.imagePath} alt={listing.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h2 className="text-xl font-semibold">{listing.title}</h2>
                    <p className="text-sm font-medium text-foreground">Starting from $36</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
