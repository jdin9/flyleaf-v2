"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

import { initialDesigns, type Design } from "@/data/designs";
import { initialPricing } from "@/data/pricing";

type SellerDesign = Design & {
  pricing?: {
    baseFee: string;
    pageFee: string;
  };
};

let designIdCounter = initialDesigns.length;

export default function SellerDesignDashboardPage() {
  const [designs, setDesigns] = useState<SellerDesign[]>(initialDesigns);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [baseFee, setBaseFee] = useState("");
  const [pageFee, setPageFee] = useState("");
  const [designType, setDesignType] = useState<Design["designType"]>("Continuous");
  const [isCollection, setIsCollection] = useState(false);
  const [spineArtwork, setSpineArtwork] = useState<File | null>(null);
  const [frontCover, setFrontCover] = useState<File | null>(null);
  const [backCover, setBackCover] = useState<File | null>(null);
  const [collectionBooks, setCollectionBooks] = useState<
    { id: number; title: string; front: File | null; back: File | null }[]
  >([]);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const resetForm = () => {
    setName("");
    setTags("");
    setBaseFee("");
    setPageFee("");
    setDesignType("Continuous");
    setIsCollection(false);
    setSpineArtwork(null);
    setFrontCover(null);
    setBackCover(null);
    setCollectionBooks([]);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormNotice(null);

    if (!name.trim()) {
      setFormNotice("Give the design a name before saving.");
      return;
    }

    if (designType === "Continuous" && !spineArtwork) {
      setFormNotice("Continuous designs require a spine artwork file.");
      return;
    }

    const normalizedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const normalizedBaseFee = baseFee.trim();
    const normalizedPageFee = pageFee.trim();

    const newDesign: SellerDesign = {
      id: ++designIdCounter,
      name: name.trim(),
      orders: 0,
      addedAt: new Date().toISOString().slice(0, 10),
      previewUrl: null,
      previewBackground: "linear-gradient(135deg, rgba(148,163,184,0.25) 0%, rgba(15,23,42,0.4) 100%)",
      tags: normalizedTags,
      designType,
      isCollection,
      artwork: {
        spine: spineArtwork?.name ?? null,
        front: frontCover?.name ?? null,
        back: backCover?.name ?? null,
        collectionBooks:
          isCollection && collectionBooks.length > 0
            ? collectionBooks.map((book, index) => ({
                id: `collection-${designIdCounter}-${index + 1}`,
                title: book.title.trim() || null,
                front: book.front?.name ?? null,
                back: book.back?.name ?? null,
              }))
            : [],
      },
      pricing:
        normalizedBaseFee || normalizedPageFee
          ? {
              baseFee: normalizedBaseFee,
              pageFee: normalizedPageFee,
            }
          : undefined,
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
                      <p className="text-sm text-muted">Artwork preview will appear here once assets are provided.</p>
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
              className="w-full max-w-xl rounded-3xl border border-border bg-panel/90 p-8 shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Add a new design</h2>
                  <p className="text-sm text-muted">
                    Add design details and optional tags. Designs are published to the library as soon as you save them.
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

                <div className="space-y-4 rounded-2xl border border-border/80 bg-background/40 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Pricing</p>
                    <p className="mt-1 text-sm text-muted">
                      Set the pricing customers will see for this design in CAD.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-muted">Set base fee (CAD)</span>
                      <input
                        value={baseFee}
                        onChange={(event) => setBaseFee(event.target.value)}
                        placeholder="e.g. 25.00"
                        className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-foreground/40"
                        type="number"
                        min={0}
                        step="0.01"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-muted">Set page fee (CAD)</span>
                      <input
                        value={pageFee}
                        onChange={(event) => setPageFee(event.target.value)}
                        placeholder="e.g. 1.50"
                        className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-foreground/40"
                        type="number"
                        min={0}
                        step="0.01"
                      />
                    </label>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Flyleaf pricing reference</p>
                    <p className="mt-2 text-xs text-muted">
                      Customers will see pricing based on Flyleaf fees in addition to the prices you set.
                    </p>
                    <dl className="mt-3 space-y-2 text-sm text-muted">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="font-medium text-foreground">Flyleaf base fee</dt>
                        <dd>${initialPricing.basePrice.toFixed(2)} CAD</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="font-medium text-foreground">Flyleaf page fee</dt>
                        <dd>${initialPricing.pagePrice.toFixed(2)} CAD</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/80 bg-background/40 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Design</p>
                    <p className="mt-1 text-sm text-muted">Specify how this artwork should be applied to the product.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-muted">Design type</span>
                      <select
                        value={designType}
                        onChange={(event) => setDesignType(event.target.value as Design["designType"])}
                        className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-foreground/40"
                      >
                        <option value="Continuous">Continuous</option>
                        <option value="Spine and Cover">Spine and Cover</option>
                      </select>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/20 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isCollection}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setIsCollection(checked);
                          if (!checked) {
                            setCollectionBooks([]);
                          }
                        }}
                        className="mt-1 h-4 w-4 rounded border-border text-foreground focus:ring-foreground/40"
                      />
                      <div className="space-y-1">
                        <span className="block text-sm font-medium text-muted">Collection</span>
                        <p className="text-xs text-muted">Mark if this design belongs to a curated collection.</p>
                      </div>
                    </label>
                    <div className="space-y-3 rounded-xl border border-border/60 bg-background/20 p-4">
                      <div className="space-y-1">
                        <span className="block text-sm font-medium text-muted">Artwork files</span>
                        <p className="text-xs text-muted">
                          Upload production-ready artwork. Spine files are required for continuous wraps.
                        </p>
                      </div>
                      <label className="block space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted">Spine</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          required={designType === "Continuous"}
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setSpineArtwork(file);
                          }}
                          className="block w-full cursor-pointer rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:border-foreground/40"
                        />
                        {spineArtwork ? (
                          <p className="text-xs text-muted">Selected file: {spineArtwork.name}</p>
                        ) : null}
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block space-y-2">
                          <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted">Front cover</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setFrontCover(file);
                            }}
                            className="block w-full cursor-pointer rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:border-foreground/40"
                          />
                          {frontCover ? (
                            <p className="text-xs text-muted">Selected file: {frontCover.name}</p>
                          ) : null}
                        </label>
                        <label className="block space-y-2">
                          <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted">Back cover</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setBackCover(file);
                            }}
                            className="block w-full cursor-pointer rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:border-foreground/40"
                          />
                          {backCover ? (
                            <p className="text-xs text-muted">Selected file: {backCover.name}</p>
                          ) : null}
                        </label>
                      </div>
                      {isCollection ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted">
                              Collection books
                            </span>
                            <p className="text-xs text-muted">
                              Add optional front and back covers for each book while keeping the spine consistent.
                            </p>
                          </div>
                          <div className="space-y-3">
                            {collectionBooks.map((book, index) => (
                              <div
                                key={book.id}
                                className="space-y-3 rounded-xl border border-border bg-background/30 p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-muted">Book {index + 1}</p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCollectionBooks((current) =>
                                        current.filter((entry) => entry.id !== book.id),
                                      )
                                    }
                                    className="text-xs font-semibold text-muted transition hover:text-foreground"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <label className="block space-y-2">
                                  <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted">
                                    Book title
                                  </span>
                                  <input
                                    type="text"
                                    value={book.title}
                                    onChange={(event) => {
                                      const title = event.target.value;
                                      setCollectionBooks((current) =>
                                        current.map((entry) =>
                                          entry.id === book.id ? { ...entry, title } : entry,
                                        ),
                                      );
                                    }}
                                    placeholder="e.g. Volume One"
                                    className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-foreground/40"
                                  />
                                </label>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="block space-y-2">
                                    <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted">
                                      Front cover
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null;
                                        setCollectionBooks((current) =>
                                          current.map((entry) =>
                                            entry.id === book.id
                                              ? { ...entry, front: file }
                                              : entry,
                                          ),
                                        );
                                      }}
                                      className="block w-full cursor-pointer rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:border-foreground/40"
                                    />
                                    {book.front ? (
                                      <p className="text-xs text-muted">Selected file: {book.front.name}</p>
                                    ) : null}
                                  </label>
                                  <label className="block space-y-2">
                                    <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted">
                                      Back cover
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null;
                                        setCollectionBooks((current) =>
                                          current.map((entry) =>
                                            entry.id === book.id
                                              ? { ...entry, back: file }
                                              : entry,
                                          ),
                                        );
                                      }}
                                      className="block w-full cursor-pointer rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:border-foreground/40"
                                    />
                                    {book.back ? (
                                      <p className="text-xs text-muted">Selected file: {book.back.name}</p>
                                    ) : null}
                                  </label>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setCollectionBooks((current) => [
                                  ...current,
                                  { id: Date.now() + Math.random(), title: "", front: null, back: null },
                                ])
                              }
                              className="w-full rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition hover:border-foreground/40 hover:text-foreground"
                            >
                              Add book
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

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
