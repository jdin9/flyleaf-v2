"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { initialDesigns, type Design } from "@/data/designs";

type SellerDesign = Design;

let designIdCounter = initialDesigns.length;

export default function SellerDesignDashboardPage() {
  const [designs, setDesigns] = useState<SellerDesign[]>(initialDesigns);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const resetForm = () => {
    setName("");
    setTags("");
    setImagePreview(null);
    setFormNotice(null);
  };

  const totals = useMemo(() => {
    const totalOrders = designs.reduce((sum, design) => sum + design.orders, 0);
    const mostPopular = designs.reduce<SellerDesign | null>((current, design) => {
      if (!current) return design;
      return design.orders > current.orders ? design : current;
    }, null);

    return {
      totalOrders,
      totalDesigns: designs.length,
      mostPopularName: mostPopular?.name ?? "—",
      mostPopularOrders: mostPopular?.orders ?? 0,
    };
  }, [designs]);

  const filteredDesigns = useMemo(() => {
    if (!searchQuery.trim()) return designs;
    const normalized = searchQuery.trim().toLowerCase();
    return designs.filter((design) => {
      return (
        design.name.toLowerCase().includes(normalized) ||
        design.tags.some((tag) => tag.toLowerCase().includes(normalized))
      );
    });
  }, [designs, searchQuery]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormNotice("Please upload a valid image file (JPEG or PNG).");
      setImagePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : null);
      setFormNotice(null);
    };
    reader.onerror = () => {
      setFormNotice("We couldn't read that file. Please try again.");
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setFormNotice("Give the design a name before saving.");
      return;
    }

    if (!imagePreview) {
      setFormNotice("Upload artwork to create a new design.");
      return;
    }

    const normalizedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const newDesign: SellerDesign = {
      id: ++designIdCounter,
      name: name.trim(),
      orders: 0,
      addedAt: new Date().toISOString().slice(0, 10),
      previewUrl: imagePreview,
      previewBackground: "linear-gradient(135deg, rgba(148,163,184,0.25) 0%, rgba(15,23,42,0.4) 100%)",
      tags: normalizedTags,
    };

    setDesigns((current) => [newDesign, ...current]);
    resetForm();
    setIsModalOpen(false);
  };

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-muted">Flyleaf Frames</p>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold md:text-5xl">Seller Design Dashboard</h1>
              <p className="max-w-2xl text-lg text-muted">
                Manage the artwork library your customers browse in the designer. Upload new covers, monitor their
                adoption, and curate collections that are ready for production.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Add design
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-panel/80 p-6 backdrop-blur">
            <p className="text-sm text-muted">Total designs</p>
            <p className="mt-2 text-3xl font-semibold">{totals.totalDesigns}</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel/80 p-6 backdrop-blur">
            <p className="text-sm text-muted">Orders placed</p>
            <p className="mt-2 text-3xl font-semibold">{totals.totalOrders.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel/80 p-6 backdrop-blur">
            <p className="text-sm text-muted">Most popular</p>
            <div className="mt-2 space-y-1">
              <p className="text-xl font-semibold">{totals.mostPopularName}</p>
              <p className="text-sm text-muted">{totals.mostPopularOrders} orders</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Design library</h2>
              <p className="text-sm text-muted">
                {filteredDesigns.length} design{filteredDesigns.length === 1 ? "" : "s"} available for selection.
              </p>
            </div>
            <div className="w-full md:w-auto">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search designs"
                className="w-full rounded-full border border-border bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/40 md:min-w-[260px]"
                type="search"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredDesigns.map((design) => (
              <article
                key={design.id}
                className="flex flex-col gap-4 rounded-3xl border border-border bg-panel/80 p-6 backdrop-blur transition hover:border-foreground/30"
              >
                <div
                  className="relative h-48 w-full overflow-hidden rounded-2xl border border-border/60"
                  style={
                    design.previewUrl
                      ? undefined
                      : {
                          backgroundImage: design.previewBackground,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                  }
                >
                  {design.previewUrl ? (
                    <Image
                      src={design.previewUrl}
                      alt={`${design.name} artwork`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-background/40 text-center">
                      <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs uppercase tracking-[0.25em]">
                        Preview
                      </span>
                      <p className="text-sm text-muted">Upload artwork to replace this gradient placeholder.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{design.name}</h3>
                        <p className="text-sm text-muted">Added {design.addedAt}</p>
                      </div>
                      <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted">
                        {design.orders === 0 ? "New" : design.orders < 25 ? "Growing" : "Top pick"}
                      </span>
                    </div>
                    {design.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {design.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/40 px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted">Orders</p>
                      <p className="text-xl font-semibold">{design.orders.toLocaleString()}</p>
                    </div>
                    <button className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition hover:border-foreground/40 hover:text-foreground">
                      View insights
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredDesigns.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
              No designs match that search yet. Try another name or tag.
            </div>
          ) : null}
        </section>

        {isModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur"
            onClick={() => {
              resetForm();
              setIsModalOpen(false);
            }}
          >
            <div
              className="w-full max-w-xl rounded-3xl border border-border bg-panel/90 p-8 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Add a new design</h2>
                  <p className="text-sm text-muted">
                    Upload artwork and optional tags. Designs are published to the library as soon as you save them.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(false);
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:border-foreground/40 hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-muted">Design name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Midnight Skyline"
                    className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-foreground/40"
                    type="text"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-muted">Tags</span>
                  <input
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="Separate tags with commas"
                    className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-foreground/40"
                    type="text"
                  />
                </label>

                <label className="block space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted">Artwork</span>
                    {imagePreview ? (
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="text-xs font-medium text-muted transition hover:text-foreground"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="relative h-48 w-full">
                    <div
                      className={`absolute inset-0 overflow-hidden rounded-2xl border border-border bg-background/40 ${imagePreview ? "" : "border-dashed"}`}
                    >
                      {imagePreview ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={imagePreview}
                            alt="Preview of uploaded design"
                            fill
                            className="object-cover"
                            sizes="(min-width: 1024px) 420px, 100vw"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-sm text-muted">
                          <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs uppercase tracking-[0.25em]">
                            Upload artwork
                          </span>
                          <p>Drag a file here, or browse to upload an image.</p>
                        </div>
                      )}
                    </div>
                    <input
                      onChange={handleImageUpload}
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      title=""
                    />
                  </div>
                </label>

                {formNotice ? <p className="text-sm text-muted">{formNotice}</p> : null}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsModalOpen(false);
                    }}
                    className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted transition hover:border-foreground/40 hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-foreground px-6 py-2 text-sm font-semibold text-background transition hover:opacity-90"
                  >
                    Save design
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
