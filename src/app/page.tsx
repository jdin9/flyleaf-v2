"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { initialDesigns } from "@/data/designs";

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeTerm, setActiveTerm] = useState("");

  const filteredDesigns = useMemo(() => {
    const normalized = activeTerm.trim().toLowerCase();
    if (!normalized) {
      return initialDesigns;
    }

    return initialDesigns.filter((design) => {
      return (
        design.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
        design.name.toLowerCase().includes(normalized)
      );
    });
  }, [activeTerm]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveTerm(query);
  };

  const handleClear = () => {
    setQuery("");
    setActiveTerm("");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/designer"
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wide text-background transition hover:opacity-90"
              >
                Open designer
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-foreground/40"
              >
                Admin dashboard
              </Link>
              <Link
                href="/admin/design-dashboard"
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-foreground/40"
              >
                Design library
              </Link>
            </div>
            <form
              onSubmit={handleSearch}
              className="flex w-full flex-wrap items-center gap-2 rounded-full border border-border bg-panel/70 px-3 py-2 text-sm text-muted sm:w-auto"
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tags or titles"
                className="flex-1 bg-transparent px-2 py-1 text-foreground outline-none"
                type="search"
                aria-label="Search designs by tag"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wide text-background transition hover:opacity-90"
                >
                  Search
                </button>
                {activeTerm ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-foreground/40"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </form>
          </div>
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-muted">Flyleaf</p>
            <h1 className="text-4xl font-semibold sm:text-5xl">Judge every book by its cover.</h1>
            <p className="text-lg text-muted">
              Bring your shelves to life with dust jackets that make every spine a showpiece before the first page turns.
            </p>
            {activeTerm ? (
              <p className="text-sm text-muted">
                Showing designs tagged with <span className="font-medium text-foreground">{activeTerm}</span>.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex-1">
          {filteredDesigns.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted">
              No designs match that search yet. Try a different tag.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDesigns.map((design) => (
                <article
                  key={design.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-panel/70 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border/50">
                    {design.previewUrl ? (
                      <Image
                        src={design.previewUrl}
                        alt={`${design.name} cover art`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{ background: design.previewBackground }}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold">{design.name}</h2>
                      <p className="text-sm text-muted">Added {design.addedAt}</p>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2 text-xs text-muted">
                      {design.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-border px-3 py-1 uppercase tracking-wide">
                          {tag}
                        </span>
                      ))}
                    </div>
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
