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
const INCH_TO_MM = 25.4;
const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 11;
const PAGE_WIDTH_MM = PAGE_WIDTH_IN * INCH_TO_MM;
const PAGE_HEIGHT_MM = PAGE_HEIGHT_IN * INCH_TO_MM;
const MM_TO_POINTS = 72 / INCH_TO_MM;

type PdfLibModule = typeof import("pdf-lib");

let pdfLibPromise: Promise<PdfLibModule> | null = null;
const loadPdfLib = () => {
  if (!pdfLibPromise) {
    pdfLibPromise = import("pdf-lib");
  }
  return pdfLibPromise;
};

const mmToPoints = (value: number) => value * MM_TO_POINTS;
const toPercent = (value: number, total: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0) {
    return "0%";
  }
  return `${(value / total) * 100}%`;
};
const PAGE_ASPECT_RATIO_PERCENT = (PAGE_HEIGHT_MM / PAGE_WIDTH_MM) * 100;

const strings = {
  pdfHeading: "Section 4 · PDF preview",
  pdfDescription: "Live, paginated proofs update automatically as you refine the artwork and book settings.",
  exportCta: "Export PDF",
  exportCtaWorking: "Preparing PDF…",
  noArtworkMessage: "Upload dust jacket artwork to generate print-ready PDF pages.",
  lowResolutionPrompt:
    "This artwork is below the recommended print resolution. Continue to export anyway?",
  exportError:
    "We couldn't create the PDF. Please try again after adjusting the artwork or refreshing the page.",
};

const trackEvent = (event: string, payload?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  const globalWindow = window as typeof window & { dataLayer?: Record<string, unknown>[] };
  if (!globalWindow.dataLayer) {
    globalWindow.dataLayer = [];
  }
  globalWindow.dataLayer.push({ event, timestamp: Date.now(), ...payload });
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event, payload ?? {});
  }
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

export default function DesignerPage() {
  const [books, setBooks] = useState<BookSettings[]>([createBook()]);
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const [previewBounds, setPreviewBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const bookCentersMm = useMemo(() => {
    let runningOffset = 0;
    return books.map((book, index) => {
      const center = runningOffset + book.spineWidth / 2;
      runningOffset += book.spineWidth;
      if (index < books.length - 1) {
        runningOffset += BOOK_GAP_MM;
      }
      return center;
    });
  }, [books]);

  const artworkDisplayWidthMm = artworkDisplayWidth / MM_TO_PX;
  const artworkDisplayHeightMm = artworkDisplayHeight / MM_TO_PX;
  const imageLeftInPreviewMm = totalWidthMm / 2 - artworkDisplayWidthMm / 2 + translateXPx / MM_TO_PX;
  const imageTopWithinAreaMm = maxHeightMm / 2 - artworkDisplayHeightMm / 2 + translateYPx / MM_TO_PX;
  const bookAreaTopOnPageMm = Math.max((PAGE_HEIGHT_MM - maxHeightMm) / 2, 0);
  const bookAreaHeightMm = Math.min(maxHeightMm, PAGE_HEIGHT_MM);

  const pdfPages = useMemo(
    () =>
      books.map((book, index) => {
        const spineCenterMm = bookCentersMm[index] ?? 0;
        const spineWidthMm = Math.max(book.spineWidth, 0);
        const spineLeftMm = PAGE_WIDTH_MM / 2 - spineWidthMm / 2;
        const spineRightMm = spineLeftMm + spineWidthMm;
        const imageLeftMm = PAGE_WIDTH_MM / 2 - spineCenterMm + imageLeftInPreviewMm;
        const imageTopMm = bookAreaTopOnPageMm + imageTopWithinAreaMm;

        return {
          book,
          index,
          spineWidthMm,
          spineLeftMm,
          spineRightMm,
          imageLeftMm,
          imageTopMm,
          imageWidthMm: artworkDisplayWidthMm,
          imageHeightMm: artworkDisplayHeightMm,
          bookAreaTopMm: bookAreaTopOnPageMm,
          bookAreaHeightMm,
        };
      }),
    [
      bookAreaHeightMm,
      bookAreaTopOnPageMm,
      books,
      bookCentersMm,
      imageLeftInPreviewMm,
      imageTopWithinAreaMm,
      artworkDisplayHeightMm,
      artworkDisplayWidthMm,
    ],
  );

  const isLowResolutionArtwork = Boolean(image && imageNotice && imageNotice.toLowerCase().includes("lower quality"));
  const exportDisabled = !image || !pdfPages.length || isExporting;

  const handleExportPdf = useCallback(async () => {
    if (!image || !pdfPages.length || isExporting) return;

    if (isLowResolutionArtwork) {
      const confirmed = window.confirm(strings.lowResolutionPrompt);
      if (!confirmed) {
        trackEvent("pdf-export.cancelled-low-resolution", { imageName: image.name });
        return;
      }
      trackEvent("pdf-export.continued-low-resolution", { imageName: image.name });
    }

    try {
      setExportError(null);
      setIsExporting(true);
      trackEvent("pdf-export.started", { pages: pdfPages.length, imageName: image.name });

      const { PDFDocument, rgb } = await loadPdfLib();
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error("Failed to load artwork for PDF export.");
      }
      const buffer = await response.arrayBuffer();

      const pdfDoc = await PDFDocument.create();
      const loweredMime = image.mimeType.toLowerCase();
      const embeddedImage = loweredMime.includes("png")
        ? await pdfDoc.embedPng(buffer)
        : await pdfDoc.embedJpg(buffer);

      const pageWidthPoints = mmToPoints(PAGE_WIDTH_MM);
      const pageHeightPoints = mmToPoints(PAGE_HEIGHT_MM);

      const lineColor = rgb(0.62, 0.68, 0.8);
      const centerLineColor = rgb(0.45, 0.52, 0.64);
      const spineFill = rgb(0.11, 0.24, 0.43);

      pdfPages.forEach((layout, pageIndex) => {
        const page = pdfDoc.addPage([pageWidthPoints, pageHeightPoints]);
        page.drawRectangle({ x: 0, y: 0, width: pageWidthPoints, height: pageHeightPoints, color: rgb(1, 1, 1) });

        if (layout.spineWidthMm > 0) {
          page.drawRectangle({
            x: mmToPoints(layout.spineLeftMm),
            y: 0,
            width: mmToPoints(layout.spineWidthMm),
            height: pageHeightPoints,
            color: spineFill,
            opacity: 0.08,
          });
        }

        const imageWidthPoints = mmToPoints(layout.imageWidthMm);
        const imageHeightPoints = mmToPoints(layout.imageHeightMm);
        const imageLeftPoints = mmToPoints(layout.imageLeftMm);
        const imageBottomPoints = mmToPoints(PAGE_HEIGHT_MM - layout.imageTopMm - layout.imageHeightMm);

        page.drawImage(embeddedImage, {
          x: imageLeftPoints,
          y: imageBottomPoints,
          width: imageWidthPoints,
          height: imageHeightPoints,
        });

        const leftLineX = mmToPoints(layout.spineLeftMm);
        const rightLineX = mmToPoints(layout.spineRightMm);
        const centerLineX = mmToPoints(PAGE_WIDTH_MM / 2);

        page.drawLine({
          start: { x: leftLineX, y: 0 },
          end: { x: leftLineX, y: pageHeightPoints },
          thickness: 0.65,
          color: lineColor,
          opacity: 0.55,
        });
        page.drawLine({
          start: { x: rightLineX, y: 0 },
          end: { x: rightLineX, y: pageHeightPoints },
          thickness: 0.65,
          color: lineColor,
          opacity: 0.55,
        });
        page.drawLine({
          start: { x: centerLineX, y: 0 },
          end: { x: centerLineX, y: pageHeightPoints },
          thickness: 0.45,
          color: centerLineColor,
          opacity: 0.5,
        });

        trackEvent("pdf-export.page-rendered", {
          pageIndex: pageIndex + 1,
          spineWidthMm: layout.spineWidthMm,
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      anchor.href = blobUrl;
      anchor.download = `flyleaf-dust-jackets-${timestamp}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
      trackEvent("pdf-export.completed", { pages: pdfPages.length, imageName: image.name });
    } catch (error) {
      console.error("Failed to export PDF", error);
      setExportError(strings.exportError);
      trackEvent("pdf-export.failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      setIsExporting(false);
    }
  }, [image, pdfPages, isExporting, isLowResolutionArtwork]);

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

          <section className="flex flex-col gap-6">
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

            <section className="flex min-h-[520px] flex-col rounded-2xl border border-border/30 bg-panel/60 p-6 shadow-lg shadow-black/20">
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
          </section>
        </div>

        <section className="mb-10 rounded-2xl border border-border/30 bg-panel/60 p-6 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">{strings.pdfHeading}</h2>
              <p className="text-sm text-muted/80">{strings.pdfDescription}</p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportDisabled}
                className="inline-flex items-center justify-center rounded-full border border-border/50 bg-foreground/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-background transition hover:bg-foreground disabled:cursor-not-allowed disabled:border-border/30 disabled:bg-border/40 disabled:text-muted"
              >
                {isExporting ? strings.exportCtaWorking : strings.exportCta}
              </button>
              {exportError && <p className="text-xs text-red-300">{exportError}</p>}
              {!image && !exportError && (
                <p className="text-xs text-muted">{strings.noArtworkMessage}</p>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-10">
            {image ? (
              pdfPages.map((page) => {
                const spineWidthPercent = toPercent(page.spineWidthMm, PAGE_WIDTH_MM);
                const spineLeftPercent = toPercent(page.spineLeftMm, PAGE_WIDTH_MM);
                const spineRightPercent = toPercent(page.spineRightMm, PAGE_WIDTH_MM);
                const imageLeftPercent = toPercent(page.imageLeftMm, PAGE_WIDTH_MM);
                const imageTopPercent = toPercent(page.imageTopMm, PAGE_HEIGHT_MM);
                const imageWidthPercent = toPercent(page.imageWidthMm, PAGE_WIDTH_MM);
                const imageHeightPercent = toPercent(page.imageHeightMm, PAGE_HEIGHT_MM);
                const bookAreaTopPercent = toPercent(page.bookAreaTopMm, PAGE_HEIGHT_MM);
                const bookAreaHeightPercent = toPercent(page.bookAreaHeightMm, PAGE_HEIGHT_MM);

                return (
                  <div key={page.book.id} className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.35em] text-muted">
                        Page {page.index + 1} · Book {page.index + 1}
                      </p>
                      <p className="text-xs text-muted/70">Spine width · {Math.round(page.spineWidthMm)} mm</p>
                    </div>
                    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-border/30 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.8)]">
                      <div style={{ paddingTop: `${PAGE_ASPECT_RATIO_PERCENT}%` }} />
                      <div className="absolute inset-0">
                        <div className="pointer-events-none absolute inset-0">
                          <div
                            className="absolute inset-y-0 rounded-sm bg-sky-400/10"
                            style={{ left: spineLeftPercent, width: spineWidthPercent, zIndex: 0 }}
                          />
                          <div
                            className="absolute inset-y-0 border-l border-dashed border-sky-600/50"
                            style={{ left: spineLeftPercent, zIndex: 1 }}
                          />
                          <div
                            className="absolute inset-y-0 border-l border-dashed border-sky-600/50"
                            style={{ left: spineRightPercent, zIndex: 1 }}
                          />
                          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-500/40" />
                          <div
                            className="absolute inset-x-0 border border-dashed border-slate-300/70"
                            style={{ top: bookAreaTopPercent, height: bookAreaHeightPercent }}
                          />
                        </div>
                        {image ? (
                          <Image
                            src={image.url}
                            alt={`PDF page preview for book ${page.index + 1}`}
                            width={image.width}
                            height={image.height}
                            unoptimized
                            className="pointer-events-none select-none"
                            style={{
                              position: "absolute",
                              left: imageLeftPercent,
                              top: imageTopPercent,
                              width: imageWidthPercent,
                              height: imageHeightPercent,
                              maxWidth: "none",
                              maxHeight: "none",
                              objectFit: "cover",
                              zIndex: 5,
                            }}
                            sizes="(min-width: 1024px) 768px, 100vw"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border/50 bg-black/20 p-10 text-center text-sm text-muted">
                {strings.noArtworkMessage}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
