"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChangeEvent,
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type BookSettings = {
  id: number;
  spineWidth: number;
  coverWidth: number;
  height: number;
  color: string;
};

type ImageAsset = {
  url: string;
  width: number;
  height: number;
  name: string;
  mimeType: string;
};

const MAX_BOOKS = 50;
const MIN_IMAGE_WIDTH = 3300;
const MIN_IMAGE_HEIGHT = 5100;
const BOOK_GAP_MM = 2;
const WRAP_MARGIN_CM = 2;
const WRAP_MARGIN_MM = WRAP_MARGIN_CM * 10;
const TOTAL_WRAP_ALLOWANCE_MM = WRAP_MARGIN_MM * 2;
const TOP_MARGIN_MM = 2;
const MM_TO_PX = 3.7795275591; // 96 DPI reference for converting mm to px
const SECTION_HORIZONTAL_PADDING_PX = 24; // Tailwind p-6

const strings = {
  blankPagesHeading: "Section 4 · Page previews",
  blankPagesDescription:
    "Each book receives a blank 11×17\" spread. These previews share the live preview’s width so you can plan layouts per book.",
  pdfHeading: "Section 5 · PDF preview",
  pdfDescription: "We’re rebuilding this experience to make PDF previews and exports more reliable.",
  pdfPlaceholder: "PDF previews and exports will return soon. For now, continue refining artwork in the sections above.",
};

let bookIdCounter = 0;
const createBook = (): BookSettings => ({
  id: ++bookIdCounter,
  spineWidth: 30,
  coverWidth: 140,
  height: 210,
  color: "#1d4ed8",
});

const mmToPx = (value: number) => value * MM_TO_PX;
const PAGE_WIDTH_IN = 17;
const PAGE_HEIGHT_IN = 11;

export default function DesignerPage() {
  const [books, setBooks] = useState<BookSettings[]>([createBook()]);
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const livePreviewSectionRef = useRef<HTMLElement | null>(null);
  const [previewBounds, setPreviewBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [livePreviewSectionBounds, setLivePreviewSectionBounds] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image.url);
      }
    };
  }, [image]);

  const previewBackdropStyle = useMemo<CSSProperties>(() => {
    if (image) return {};

    return {
      backgroundImage:
        "linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
      backgroundSize: "80px 80px",
      backgroundColor: "rgba(15, 23, 42, 0.6)",
    };
  }, [image]);

  const handleImageUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageNotice("Please upload a JPEG or PNG file.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const resolutionWarning =
        img.width < MIN_IMAGE_WIDTH || img.height < MIN_IMAGE_HEIGHT
          ? `This artwork is below the recommended ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT} pixels (11×17\" at 300 DPI). It may print with lower quality.`
          : null;

      const asset: ImageAsset = {
        url,
        width: img.width,
        height: img.height,
        name: file.name,
        mimeType: file.type,
      };

      setImageNotice(resolutionWarning);
      setImage((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous.url);
        }
        return asset;
      });
    };

    img.onerror = () => {
      setImageNotice("We couldn't read that file. Please try another image.");
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, []);

  const updateBook = useCallback((id: number, field: keyof BookSettings, rawValue: string) => {
    setBooks((current) =>
      current.map((book) => {
        if (book.id !== id) return book;

        if (field === "color") {
          return { ...book, color: rawValue };
        }

        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) return book;
        return { ...book, [field]: Math.max(numeric, 0) };
      }),
    );
  }, []);

  const addBook = useCallback(() => {
    setBooks((current) => {
      if (current.length >= MAX_BOOKS) return current;
      return [...current, createBook()];
    });
  }, []);

  const removeBook = useCallback((id: number) => {
    setBooks((current) => (current.length > 1 ? current.filter((book) => book.id !== id) : current));
  }, []);

  const totalWidthMm = useMemo(() => {
    if (!books.length) return 0;
    const booksWidth = books.reduce((sum, book) => sum + book.spineWidth, 0);
    const gaps = BOOK_GAP_MM * Math.max(books.length - 1, 0);
    return booksWidth + gaps;
  }, [books]);

  const maxHeightMm = useMemo(
    () => books.reduce((max, book) => Math.max(max, book.height), 0),
    [books],
  );

  const totalWidthPx = Math.max(mmToPx(totalWidthMm), 1);
  const maxHeightPx = Math.max(mmToPx(maxHeightMm), 1);
  const targetArtworkHeightPx = mmToPx(maxHeightMm);
  const topMarginPx = mmToPx(TOP_MARGIN_MM);

  const artworkBaseScale = useMemo(() => {
    if (!image) return 1;
    if (!image.width || !image.height) return 1;
    if (!Number.isFinite(targetArtworkHeightPx) || targetArtworkHeightPx <= 0) return 1;
    return targetArtworkHeightPx / image.height;
  }, [image, targetArtworkHeightPx]);

  const baseArtworkHeightPx = useMemo(() => {
    if (!image) return maxHeightPx;
    return image.height * artworkBaseScale;
  }, [artworkBaseScale, image, maxHeightPx]);

  const baseArtworkWidthPx = useMemo(() => {
    if (!image) return totalWidthPx;
    return image.width * artworkBaseScale;
  }, [artworkBaseScale, image, totalWidthPx]);

  const minimumArtworkWidthPx = useMemo(
    () => mmToPx(totalWidthMm + TOTAL_WRAP_ALLOWANCE_MM),
    [totalWidthMm],
  );

  const minimumArtworkHeightPx = useMemo(
    () => mmToPx(maxHeightMm + TOP_MARGIN_MM),
    [maxHeightMm],
  );

  const minZoomPercent = useMemo(() => {
    if (!image) return 50;
    if (!baseArtworkWidthPx) return 50;

    const minScaleFromWidth = minimumArtworkWidthPx / baseArtworkWidthPx;
    const minScaleFromHeight =
      baseArtworkHeightPx > 0 ? minimumArtworkHeightPx / baseArtworkHeightPx : 0;

    const minScale = Math.max(minScaleFromWidth, minScaleFromHeight);

    if (!Number.isFinite(minScale) || minScale <= 0) return 50;

    const minPercent = Math.ceil(minScale * 100);
    return Math.min(Math.max(minPercent, 50), 200);
  }, [
    baseArtworkHeightPx,
    baseArtworkWidthPx,
    image,
    minimumArtworkHeightPx,
    minimumArtworkWidthPx,
  ]);

  const resetViewport = useCallback(() => {
    setZoom((currentZoom) => {
      if (currentZoom < minZoomPercent) {
        return minZoomPercent;
      }
      return Math.max(100, minZoomPercent);
    });
    setOffsetX(0);
    setOffsetY(0);
  }, [minZoomPercent]);

  const fallbackScale = useMemo(() => Math.min(1100 / totalWidthPx, 520 / maxHeightPx, 1), [maxHeightPx, totalWidthPx]);

  const previewScale = useMemo(() => {
    if (!previewBounds.width || !previewBounds.height) {
      return fallbackScale;
    }
    return Math.min(previewBounds.width / totalWidthPx, previewBounds.height / maxHeightPx, 1);
  }, [fallbackScale, maxHeightPx, previewBounds.height, previewBounds.width, totalWidthPx]);

  const scaledPreviewWidth = totalWidthPx * previewScale;
  const scaledPreviewHeight = maxHeightPx * previewScale;
  const blankPageAspectRatio = PAGE_HEIGHT_IN / PAGE_WIDTH_IN;
  const blankPagePreviewWidth = useMemo(() => {
    if (livePreviewSectionBounds.width > 0) {
      const contentWidth = livePreviewSectionBounds.width - SECTION_HORIZONTAL_PADDING_PX * 2;
      if (Number.isFinite(contentWidth) && contentWidth > 0) {
        return contentWidth;
      }
    }

    const fallbackWidth = scaledPreviewWidth || totalWidthPx * fallbackScale;
    if (!Number.isFinite(fallbackWidth) || fallbackWidth <= 0) return 1;
    return fallbackWidth;
  }, [
    fallbackScale,
    livePreviewSectionBounds.width,
    scaledPreviewWidth,
    totalWidthPx,
  ]);
  const blankPagePreviewHeight = Math.max(blankPagePreviewWidth * blankPageAspectRatio, 1);

  const zoomScale = zoom / 100;
  const artworkDisplayWidth = baseArtworkWidthPx * zoomScale;
  const artworkDisplayHeight = baseArtworkHeightPx * zoomScale;
  const extraWidth = Math.max(artworkDisplayWidth - totalWidthPx, 0);
  const extraHeight = Math.max(artworkDisplayHeight - maxHeightPx, 0);
  const wrapMarginPx = mmToPx(WRAP_MARGIN_MM);
  const halfExtraWidth = extraWidth / 2;
  const maxHorizontalShiftPx = Math.max(halfExtraWidth - wrapMarginPx, 0);
  const translateXPx = maxHorizontalShiftPx * (offsetX / 100);

  const minVerticalOffsetPercent = useMemo(() => {
    if (!image) return -100;
    if (extraHeight <= 0) return -100;
    if (extraHeight <= topMarginPx) return 100;

    const computed = -100 + (200 * topMarginPx) / extraHeight;
    if (!Number.isFinite(computed)) return -100;

    return Math.min(100, Math.max(-100, computed));
  }, [extraHeight, image, topMarginPx]);

  const constrainedOffsetY = Math.min(100, Math.max(minVerticalOffsetPercent, offsetY));
  const translateYPx = -extraHeight * (constrainedOffsetY / 200);

  useEffect(() => {
    setZoom((current) => {
      if (current < minZoomPercent) return minZoomPercent;
      if (current > 200) return 200;
      return current;
    });
  }, [minZoomPercent]);

  useEffect(() => {
    setOffsetY((current) => {
      if (current < minVerticalOffsetPercent) return minVerticalOffsetPercent;
      if (current > 100) return 100;
      return current;
    });
  }, [minVerticalOffsetPercent]);

  useEffect(() => {
    const node = previewAreaRef.current;
    if (!node) return;

    const updateBounds = (width: number, height: number) => {
      setPreviewBounds((current) => {
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    };

    updateBounds(node.clientWidth, node.clientHeight);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        updateBounds(width, height);
      });

      observer.observe(node);
      return () => observer.disconnect();
    }

    const handleResize = () => {
      const rect = node.getBoundingClientRect();
      updateBounds(rect.width, rect.height);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const node = livePreviewSectionRef.current;
    if (!node) return;

    const updateBounds = (width: number, height: number) => {
      setLivePreviewSectionBounds((current) => {
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    };

    updateBounds(node.clientWidth, node.clientHeight);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        updateBounds(width, height);
      });

      observer.observe(node);
      return () => observer.disconnect();
    }

    const handleResize = () => {
      const rect = node.getBoundingClientRect();
      updateBounds(rect.width, rect.height);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0b1224,_#05060a)] text-foreground">
      <header className="border-b border-border/40 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted">Flyleaf</p>
            <h1 className="text-lg font-semibold">Dust Jacket Designer</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link className="transition hover:text-foreground" href="/">
              Home
            </Link>
            <span className="rounded-full border border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em]">
              docs/decisions.md
            </span>
          </nav>
        </div>
      </header>

      <main className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-border/30 bg-panel/60 p-6 shadow-lg shadow-black/20">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">Section 1 · Book details</h2>
              <p className="mt-1 text-sm text-muted/80">
                Upload artwork and configure each book’s precise measurements in millimetres.
              </p>
            </div>

            <label
              htmlFor="jacket-artwork"
              className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 bg-black/20 p-6 text-center text-sm transition hover:border-foreground/60 hover:bg-black/30"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-10 w-10 text-muted transition group-hover:text-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v1.25A2.25 2.25 0 0 0 5.25 20h13.5A2.25 2.25 0 0 0 21 17.75V16.5m-9 0V4.5m0 0L6.75 8.25M12 4.5l5.25 3.75"
                />
              </svg>
              <span className="font-medium">{image ? "Change dust jacket artwork" : "Upload dust jacket artwork"}</span>
              <span className="text-xs text-muted">JPEG or PNG · recommended {MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT}px</span>
              <input id="jacket-artwork" type="file" accept="image/jpeg,image/png" onChange={handleImageUpload} className="sr-only" />
            </label>
            {image && (
              <p className="text-xs text-muted">
                <span className="font-medium text-foreground">Loaded:</span> {image.name} ({image.width}×{image.height})
              </p>
            )}
            {imageNotice && <p className="text-xs text-amber-300">{imageNotice}</p>}

            <div className="mt-2 flex flex-col gap-4">
              {books.map((book, index) => (
                <div key={book.id} className="rounded-xl border border-border/30 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground/90">Book {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeBook(book.id)}
                      disabled={books.length === 1}
                      className="text-xs text-muted transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <label className="flex flex-col gap-1">
                      <span className="text-muted/80">Spine width (mm)</span>
                      <input
                        type="number"
                        min={0}
                        value={book.spineWidth}
                        onChange={(event) => updateBook(book.id, "spineWidth", event.target.value)}
                        className="w-full rounded-lg border border-border/40 bg-black/30 px-2 py-1 text-foreground focus:border-foreground/60 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-muted/80">Cover width (mm)</span>
                      <input
                        type="number"
                        min={0}
                        value={book.coverWidth}
                        onChange={(event) => updateBook(book.id, "coverWidth", event.target.value)}
                        className="w-full rounded-lg border border-border/40 bg-black/30 px-2 py-1 text-foreground focus:border-foreground/60 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-muted/80">Height (mm)</span>
                      <input
                        type="number"
                        min={0}
                        value={book.height}
                        onChange={(event) => updateBook(book.id, "height", event.target.value)}
                        className="w-full rounded-lg border border-border/40 bg-black/30 px-2 py-1 text-foreground focus:border-foreground/60 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-muted/80">Base colour</span>
                      <input
                        type="color"
                        value={book.color}
                        onChange={(event) => updateBook(book.id, "color", event.target.value)}
                        className="h-9 w-full cursor-pointer rounded-lg border border-border/40 bg-black/30 p-1"
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addBook}
                disabled={books.length >= MAX_BOOKS}
                className="inline-flex items-center justify-center rounded-lg border border-border/30 bg-black/20 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/60 hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add another book ({books.length}/{MAX_BOOKS})
              </button>
            </div>
          </aside>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border/30 bg-panel/60 p-6 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">Section 2 · Design dashboard</h2>
                  <p className="mt-1 text-sm text-muted/80">Adjust the shared artwork viewport. Movements apply to the background image only.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                      <span>Zoom</span>
                      <span>{zoom}%</span>
                    </div>
                    <input
                      type="range"
                      min={minZoomPercent}
                      max={200}
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                      <span>Horizontal offset</span>
                      <span>{offsetX}%</span>
                    </div>
                    <input type="range" min={-100} max={100} value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                      <span>Vertical offset</span>
                      <span>{constrainedOffsetY.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={minVerticalOffsetPercent}
                      max={100}
                      step={0.1}
                      value={constrainedOffsetY}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (!Number.isFinite(value)) return;
                        setOffsetY(Math.min(100, Math.max(minVerticalOffsetPercent, value)));
                      }}
                    />
                    <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted">
                      {minVerticalOffsetPercent.toFixed(1)}% = top limit · 100% = bottom
                    </span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <p>Preview width: {Math.round(totalWidthMm)} mm · tallest book: {Math.round(maxHeightMm)} mm</p>
                  <button
                    type="button"
                    onClick={resetViewport}
                    className="rounded-full border border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] transition hover:border-foreground/70 hover:text-foreground"
                  >
                    Reset viewport
                  </button>
                </div>
              </div>
            </div>

            <section
              ref={livePreviewSectionRef}
              className="flex min-h-[520px] flex-col rounded-2xl border border-border/30 bg-panel/60 p-6 shadow-lg shadow-black/20"
            >
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">Section 3 · Live preview</h2>
                <p className="mt-1 text-sm text-muted/80">
                  Preview focuses on each book’s spine measurements. The artwork layer sits behind the spines and responds to your dashboard controls.
                </p>
              </div>
              <div ref={previewAreaRef} className="flex flex-1 overflow-hidden rounded-xl border border-border/20 bg-black/40 p-6">
                <div className="mx-auto flex h-full w-full max-w-full items-center justify-center">
                  <div className="relative" style={{ width: `${scaledPreviewWidth}px`, height: `${scaledPreviewHeight}px` }}>
                    <div
                      className="absolute inset-0 origin-top-left"
                      style={{ width: `${totalWidthPx}px`, height: `${maxHeightPx}px`, transform: `scale(${previewScale})` }}
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-lg" style={previewBackdropStyle}>
                        {image ? (
                          <Image
                            src={image.url}
                            alt="Dust jacket artwork"
                            width={image.width}
                            height={image.height}
                            unoptimized
                            className="pointer-events-none select-none"
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "50%",
                              height: `${artworkDisplayHeight}px`,
                              width: "auto",
                              maxWidth: "none",
                              transform: `translate(-50%, -50%) translate(${translateXPx}px, ${translateYPx}px)`,
                              opacity: 0.95,
                            }}
                            sizes="100vw"
                          />
                        ) : (
                          <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-muted">
                            Upload artwork to see the live preview.
                          </div>
                        )}
                        <div className="relative z-10 flex h-full items-end">
                          {books.map((book, index) => {
                            const spineWidthPx = mmToPx(book.spineWidth);
                            const jacketHeightPx = mmToPx(book.height);

                            return (
                              <div key={book.id} className="flex flex-col items-center" style={{ marginRight: index === books.length - 1 ? 0 : mmToPx(BOOK_GAP_MM) }}>
                                <div
                                  className="flex h-full flex-col justify-center rounded border bg-foreground/5 shadow-lg shadow-black/40"
                                  style={{ width: `${spineWidthPx}px`, height: `${jacketHeightPx}px`, backgroundColor: `${book.color}33`, borderColor: book.color }}
                                />
                                <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted">Book {index + 1}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section
              className="flex flex-col rounded-2xl border border-border/30 bg-panel/60 p-6 shadow-lg shadow-black/20"
              style={
                livePreviewSectionBounds.width
                  ? { width: `${livePreviewSectionBounds.width}px` }
                  : undefined
              }
            >
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">{strings.blankPagesHeading}</h2>
                <p className="mt-1 text-sm text-muted/80">{strings.blankPagesDescription}</p>
              </div>
              <div className="flex flex-col gap-6">
                {books.map((book, index) => (
                  <div key={book.id} className="flex flex-col items-center gap-3">
                    <div className="flex w-full items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                      <span>Book {index + 1}</span>
                      <span>11×17&quot; spread</span>
                    </div>
                    <div className="flex w-full justify-center">
                      <div
                        className="relative overflow-hidden rounded-xl border border-border/30 bg-black/30 shadow-lg shadow-black/20"
                        style={{ width: `${blankPagePreviewWidth}px`, height: `${blankPagePreviewHeight}px` }}
                      >
                        <div className="absolute inset-4 rounded-lg border border-dashed border-border/40 bg-black/20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="mb-10 rounded-2xl border border-border/30 bg-panel/60 p-6 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">{strings.pdfHeading}</h2>
              <p className="text-sm text-muted/80">{strings.pdfDescription}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-border/50 bg-black/20 p-10 text-center text-sm text-muted">
            {strings.pdfPlaceholder}
          </div>
        </section>
      </main>
    </div>
  );
}
