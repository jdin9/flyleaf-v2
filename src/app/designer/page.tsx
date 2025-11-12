"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  isbn: string;
  smallText: string;
};

type ImageAsset = {
  url: string;
  width: number;
  height: number;
  name: string;
  mimeType: string;
};

type PreparedImage = {
  asset: ImageAsset;
  notice: string | null;
};

const MAX_BOOKS = 50;
const MIN_IMAGE_WIDTH = 3300;
const MIN_IMAGE_HEIGHT = 5100;
const BOOK_GAP_MM = 1;
const MAX_BOOK_HEIGHT_MM = 265;
const MAX_BOOK_TOTAL_WIDTH_MM = 400;
const WRAP_MARGIN_CM = 2;
const WRAP_MARGIN_MM = WRAP_MARGIN_CM * 10;
const TOTAL_WRAP_ALLOWANCE_MM = WRAP_MARGIN_MM * 2;
const TOP_MARGIN_MM = 2;
const MM_TO_PX = 3.7795275591; // 96 DPI reference for converting mm to px
const SECTION_HORIZONTAL_PADDING_PX = 24; // Tailwind p-6
const LARGE_TEXT_BASE_FONT_SIZE = 72;
const LARGE_TEXT_MIN_FONT_SIZE = 16;
const LARGE_TEXT_MAX_FONT_SIZE = 160;
const SMALL_TEXT_BASE_FONT_SIZE = 14;
const SMALL_TEXT_MIN_FONT_SIZE = 10;
const SMALL_TEXT_MAX_FONT_SIZE = 32;
const LARGE_TEXT_LINE_HEIGHT = 1.1;
const LARGE_TEXT_MAX_LINES = 3;
const DEFAULT_TEXT_COLOR = "#f5f8ff";
const LARGE_TEXT_FONT_OPTIONS = [
  {
    label: "Sans · Inter",
    value: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    label: "Sans · Montserrat",
    value: '"Montserrat", "Helvetica Neue", Arial, ui-sans-serif, sans-serif',
  },
  {
    label: "Serif · Playfair Display",
    value: '"Playfair Display", "Times New Roman", ui-serif, Georgia, serif',
  },
  {
    label: "Serif · Merriweather",
    value: '"Merriweather", ui-serif, Georgia, "Times New Roman", serif',
  },
  {
    label: "Slab · Roboto Slab",
    value: '"Roboto Slab", ui-serif, "Times New Roman", serif',
  },
];
const strings = {
  blankPagesHeading: "Section 4 · Page previews",
  blankPagesDescription:
    "Each book receives a blank 11×17\" spread. These previews share the live preview’s width so you can plan layouts per book.",
  orderHeading: "Section 5 · Order submission",
  orderDescription: "When you’re ready, submit the latest measurements and artwork details to place the order.",
};

let bookIdCounter = 0;
const createBook = (): BookSettings => ({
  id: ++bookIdCounter,
  spineWidth: 30,
  coverWidth: 140,
  height: 210,
  color: "#1d4ed8",
  isbn: "",
  smallText: "",
});

const mmToPx = (value: number) => value * MM_TO_PX;
const PAGE_WIDTH_IN = 17;
const PAGE_HEIGHT_IN = 11;
const INCH_TO_MM = 25.4;
const PAGE_WIDTH_MM = PAGE_WIDTH_IN * INCH_TO_MM;
const PAGE_HEIGHT_MM = PAGE_HEIGHT_IN * INCH_TO_MM;
const SMALL_TEXT_BOTTOM_OFFSET_MM = INCH_TO_MM / 2;
const PAGE_WIDTH_PX = mmToPx(PAGE_WIDTH_MM);
const PAGE_HEIGHT_PX = mmToPx(PAGE_HEIGHT_MM);

const prepareImageAsset = (blob: Blob, name: string): Promise<PreparedImage> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new window.Image();

    image.onload = () => {
      const resolutionWarning =
        image.width < MIN_IMAGE_WIDTH || image.height < MIN_IMAGE_HEIGHT
          ? `This artwork is below the recommended ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT} pixels (11×17" at 300 DPI). It may print with lower quality.`
          : null;

      resolve({
        asset: {
          url,
          width: image.width,
          height: image.height,
          name,
          mimeType: blob.type || "image/*",
        },
        notice: resolutionWarning,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image asset"));
    };

    image.src = url;
  });
};

export default function DesignerPage() {
  const [books, setBooks] = useState<BookSettings[]>([createBook()]);
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [largeText, setLargeText] = useState("");
  const [largeTextBaseFontSize, setLargeTextBaseFontSize] = useState(LARGE_TEXT_BASE_FONT_SIZE);
  const [largeTextFontSize, setLargeTextFontSize] = useState(LARGE_TEXT_BASE_FONT_SIZE);
  const [largeTextMaxFontSize, setLargeTextMaxFontSize] = useState(LARGE_TEXT_MAX_FONT_SIZE);
  const [largeTextFontFamily, setLargeTextFontFamily] = useState(
    LARGE_TEXT_FONT_OPTIONS[0]?.value ?? '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  );
  const [smallTextFontSize, setSmallTextFontSize] = useState(SMALL_TEXT_BASE_FONT_SIZE);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const livePreviewSectionRef = useRef<HTMLElement | null>(null);
  const largeTextContainerRef = useRef<HTMLDivElement | null>(null);
  const largeTextRef = useRef<HTMLDivElement | null>(null);
  const [previewBounds, setPreviewBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [livePreviewSectionBounds, setLivePreviewSectionBounds] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const searchParams = useSearchParams();
  const listingParam = searchParams?.get("listing");

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
      backgroundColor: "#ffffff",
    };
  }, [image]);

  const assignPreparedImage = useCallback((prepared: PreparedImage) => {
    setImageNotice(prepared.notice);
    setImage((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous.url);
      }
      return prepared.asset;
    });
  }, []);

  const handleLargeTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const normalized = event.target.value.replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");

    if (lines.length > LARGE_TEXT_MAX_LINES) {
      setLargeText(lines.slice(0, LARGE_TEXT_MAX_LINES).join("\n"));
      return;
    }

    setLargeText(normalized);
  }, []);

  const handleTextColorChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTextColor(event.target.value);
  }, []);

  const handleLargeTextFontFamilyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setLargeTextFontFamily(event.target.value);
  }, []);

  const handleImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setImageNotice("Please upload a JPEG or PNG file.");
        return;
      }

      try {
        const prepared = await prepareImageAsset(file, file.name);
        assignPreparedImage(prepared);
      } catch {
        setImageNotice("We couldn't read that file. Please try another image.");
      }
    },
    [assignPreparedImage],
  );

  const updateBook = useCallback((id: number, field: keyof BookSettings, rawValue: string) => {
    setBooks((current) =>
      current.map((book) => {
        if (book.id !== id) return book;

        if (field === "color") {
          return { ...book, color: rawValue };
        }

        if (field === "isbn" || field === "smallText") {
          return { ...book, [field]: rawValue };
        }

        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) return book;

        const normalizedValue = Math.max(numeric, 0);

        if (field === "height") {
          if (normalizedValue > MAX_BOOK_HEIGHT_MM) {
            window.alert("This book is too large. Maximum height is 26.5 cm (265 mm).");
            return book;
          }

          return { ...book, height: normalizedValue };
        }

        if (field === "spineWidth" || field === "coverWidth") {
          const nextSpineWidth = field === "spineWidth" ? normalizedValue : book.spineWidth;
          const nextCoverWidth = field === "coverWidth" ? normalizedValue : book.coverWidth;
          const totalWidth = nextSpineWidth + nextCoverWidth * 2;

          if (totalWidth > MAX_BOOK_TOTAL_WIDTH_MM) {
            window.alert("This book is too large. The spine plus both covers must be 40 cm (400 mm) or less.");
            return book;
          }

          return { ...book, [field]: normalizedValue };
        }

        return { ...book, [field]: normalizedValue };
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

  useEffect(() => {
    if (!listingParam) return;

    let cancelled = false;

    const loadLibraryImage = async () => {
      setImageNotice(null);

      try {
        const response = await fetch(listingParam);
        if (!response.ok) {
          throw new Error("Unable to fetch listing image");
        }

        const blob = await response.blob();
        if (blob.type && !blob.type.startsWith("image/")) {
          throw new Error("Listing asset is not an image");
        }

        const filename = listingParam.split("/").pop() ?? "library-image";
        const prepared = await prepareImageAsset(blob, filename);

        if (cancelled) {
          URL.revokeObjectURL(prepared.asset.url);
          return;
        }

        assignPreparedImage(prepared);
      } catch {
        if (!cancelled) {
          setImageNotice(
            "We couldn't load that artwork from the library. Please choose another image or upload your own.",
          );
        }
      }
    };

    loadLibraryImage();

    return () => {
      cancelled = true;
    };
  }, [assignPreparedImage, listingParam]);

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
  const smallTextBottomOffsetPx = mmToPx(SMALL_TEXT_BOTTOM_OFFSET_MM);

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
  const blankPageScale = useMemo(() => {
    if (!Number.isFinite(blankPagePreviewWidth) || blankPagePreviewWidth <= 0) {
      return previewScale;
    }

    if (!Number.isFinite(PAGE_WIDTH_PX) || PAGE_WIDTH_PX <= 0) {
      return previewScale;
    }

    return blankPagePreviewWidth / PAGE_WIDTH_PX;
  }, [blankPagePreviewWidth, previewScale]);

  const blankPagePreviewHeight = Math.max(PAGE_HEIGHT_PX * blankPageScale, 1);

  const zoomScale = zoom / 100;
  const artworkDisplayWidth = baseArtworkWidthPx * zoomScale;
  const artworkDisplayHeight = baseArtworkHeightPx * zoomScale;
  const extraWidth = Math.max(artworkDisplayWidth - totalWidthPx, 0);
  const extraHeight = Math.max(artworkDisplayHeight - maxHeightPx, 0);
  const wrapMarginPx = mmToPx(WRAP_MARGIN_MM);
  const halfExtraWidth = extraWidth / 2;
  const maxHorizontalShiftPx = Math.max(halfExtraWidth - wrapMarginPx, 0);
  const translateXPx = maxHorizontalShiftPx * (offsetX / 100);

  const pdfLayoutBaseWidth = Math.max(PAGE_WIDTH_PX, 1);
  const pdfLayoutBaseHeight = Math.max(PAGE_HEIGHT_PX, 1);

  const pdfLayoutScale = blankPageScale;

  const pdfScaledWidth = Math.max(pdfLayoutBaseWidth * pdfLayoutScale, 1);
  const pdfScaledHeight = Math.max(pdfLayoutBaseHeight * pdfLayoutScale, 1);

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

  const artworkStyle = useMemo<CSSProperties>(() => {
    if (!image) return {};

    return {
      position: "absolute",
      left: "50%",
      top: "50%",
      height: `${artworkDisplayHeight}px`,
      width: "auto",
      maxWidth: "none",
      transform: `translate(-50%, -50%) translate(${translateXPx}px, ${translateYPx}px)`,
      opacity: 0.95,
    } as CSSProperties;
  }, [artworkDisplayHeight, image, translateXPx, translateYPx]);

  const largeTextAreaHeightPx = Math.max(maxHeightPx - topMarginPx, 1);

  useLayoutEffect(() => {
    const containerNode = largeTextContainerRef.current;
    const textNode = largeTextRef.current;

    if (!containerNode || !textNode) {
      const sanitized = Math.min(
        Math.max(largeTextBaseFontSize, LARGE_TEXT_MIN_FONT_SIZE),
        LARGE_TEXT_MAX_FONT_SIZE,
      );
      setLargeTextFontSize(sanitized);
      setLargeTextMaxFontSize(LARGE_TEXT_MAX_FONT_SIZE);
      return;
    }

    if (containerNode.clientWidth <= 0 || containerNode.clientHeight <= 0) {
      const sanitized = Math.min(
        Math.max(largeTextBaseFontSize, LARGE_TEXT_MIN_FONT_SIZE),
        LARGE_TEXT_MAX_FONT_SIZE,
      );
      textNode.style.fontFamily = largeTextFontFamily;
      textNode.style.fontSize = `${sanitized}px`;
      textNode.style.lineHeight = `${LARGE_TEXT_LINE_HEIGHT}`;
      setLargeTextFontSize(sanitized);
      setLargeTextMaxFontSize(LARGE_TEXT_MAX_FONT_SIZE);
      return;
    }

    if (!largeText.trim()) {
      const sanitized = Math.min(
        Math.max(largeTextBaseFontSize, LARGE_TEXT_MIN_FONT_SIZE),
        LARGE_TEXT_MAX_FONT_SIZE,
      );
      textNode.style.fontFamily = largeTextFontFamily;
      textNode.style.fontSize = `${sanitized}px`;
      textNode.style.lineHeight = `${LARGE_TEXT_LINE_HEIGHT}`;
      setLargeTextFontSize(sanitized);
      setLargeTextMaxFontSize(LARGE_TEXT_MAX_FONT_SIZE);
      return;
    }

    const containerWidth = containerNode.clientWidth;
    const containerHeight = containerNode.clientHeight;
    const computeFittableFontSize = (startingSize: number) => {
      let size = Math.min(
        Math.max(startingSize, LARGE_TEXT_MIN_FONT_SIZE),
        LARGE_TEXT_MAX_FONT_SIZE,
      );

      textNode.style.fontSize = `${size}px`;
      textNode.style.lineHeight = `${LARGE_TEXT_LINE_HEIGHT}`;
      textNode.style.fontFamily = largeTextFontFamily;

      while (size > LARGE_TEXT_MIN_FONT_SIZE) {
        const lineHeightPx = size * LARGE_TEXT_LINE_HEIGHT;
        const maxAllowedHeight = Math.min(containerHeight, lineHeightPx * LARGE_TEXT_MAX_LINES);
        const exceedsHeight = textNode.scrollHeight > maxAllowedHeight + 0.5;
        const exceedsWidth = textNode.scrollWidth > containerWidth + 0.5;

        if (!exceedsHeight && !exceedsWidth) {
          break;
        }

        size -= 1;
        textNode.style.fontSize = `${size}px`;
      }

      return size;
    };

    const maxFittableSize = computeFittableFontSize(LARGE_TEXT_MAX_FONT_SIZE);
    const desiredSize = computeFittableFontSize(largeTextBaseFontSize);

    setLargeTextFontSize((current) => (current === desiredSize ? current : desiredSize));
    setLargeTextMaxFontSize((current) => (current === maxFittableSize ? current : maxFittableSize));
  }, [
    largeText,
    largeTextAreaHeightPx,
    largeTextBaseFontSize,
    largeTextFontFamily,
    totalWidthPx,
  ]);

  const section4ArtworkBaseStyle = useMemo<CSSProperties | null>(() => {
    if (!image) return null;

    return {
      position: "absolute",
      left: "50%",
      top: "50%",
      height: `${artworkDisplayHeight}px`,
      width: "auto",
      maxWidth: "none",
      opacity: 0.95,
    } satisfies CSSProperties;
  }, [artworkDisplayHeight, image]);

  const bookBaselineFromCenterPx = maxHeightPx / 2;

  const bookGapPx = mmToPx(BOOK_GAP_MM);
  const booksWithLayout = useMemo(() => {
    let runningOffsetPx = 0;

    return books.map((book, index) => {
      const spineWidthPx = mmToPx(book.spineWidth);
      const jacketHeightPx = mmToPx(book.height);
      const centerPx = runningOffsetPx + spineWidthPx / 2;

      runningOffsetPx += spineWidthPx;
      if (index !== books.length - 1) {
        runningOffsetPx += bookGapPx;
      }

      return {
        book,
        spineWidthPx,
        jacketHeightPx,
        centerPx,
      };
    });
  }, [bookGapPx, books]);

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

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.2em] text-muted">Large text</span>
              <textarea
                value={largeText}
                onChange={handleLargeTextChange}
                rows={3}
                className="w-full resize-none rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-foreground/60 focus:outline-none"
                placeholder="Enter text here to be displayed across all of the spines"
                style={{ fontFamily: largeTextFontFamily }}
              />
              <span className="text-[11px] uppercase tracking-[0.25em] text-muted">
                Displayed across all spines in the live preview
              </span>
            </label>

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
                    <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                      <span className="text-muted/80">ISBN #</span>
                      <input
                        type="text"
                        value={book.isbn}
                        onChange={(event) => updateBook(book.id, "isbn", event.target.value)}
                        className="w-full rounded-lg border border-border/40 bg-black/30 px-2 py-1 text-foreground focus:border-foreground/60 focus:outline-none"
                        placeholder="Optional"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="col-span-2 flex flex-col gap-1">
                      <span className="text-muted/80">Small text</span>
                      <textarea
                        value={book.smallText}
                        onChange={(event) => updateBook(book.id, "smallText", event.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-border/40 bg-black/30 px-2 py-1 text-foreground focus:border-foreground/60 focus:outline-none"
                        placeholder="Optional text shown near the bottom of this spine"
                      />
                    </label>
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
            <section className="rounded-xl border border-border/30 bg-black/20 p-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">
                  {strings.orderHeading}
                </h2>
                <p className="mt-1 text-sm text-muted/80">{strings.orderDescription}</p>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90"
              >
                Submit order
              </button>
            </section>
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
                <div className="rounded-xl border border-border/20 bg-black/10 p-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Text</h3>
                    <p className="mt-1 text-xs text-muted/80">
                      Choose a font and starting sizes for the overlay text.
                    </p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.2em] text-muted">Font</span>
                      <select
                        value={largeTextFontFamily}
                        onChange={handleLargeTextFontFamilyChange}
                        className="w-full rounded-lg border border-border/40 bg-black/30 px-3 py-2 text-sm text-foreground focus:border-foreground/60 focus:outline-none"
                      >
                        {LARGE_TEXT_FONT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                        <span>Large text size</span>
                        <span>
                          {largeTextMaxFontSize > 0
                            ? `${Math.round((largeTextFontSize / largeTextMaxFontSize) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={(() => {
                          const effectiveMax = Math.max(
                            largeTextMaxFontSize,
                            LARGE_TEXT_MIN_FONT_SIZE,
                          );
                          const range = effectiveMax - LARGE_TEXT_MIN_FONT_SIZE;
                          if (range <= 0) {
                            return 100;
                          }
                          const clampedBase = Math.min(
                            Math.max(largeTextBaseFontSize, LARGE_TEXT_MIN_FONT_SIZE),
                            effectiveMax,
                          );
                          return Math.round(
                            ((clampedBase - LARGE_TEXT_MIN_FONT_SIZE) / range) * 100,
                          );
                        })()}
                        onChange={(event) => {
                          const percent = Number(event.target.value);
                          if (!Number.isFinite(percent)) return;
                          const clampedPercent = Math.min(Math.max(percent, 0), 100);
                          const effectiveMax = Math.max(
                            largeTextMaxFontSize,
                            LARGE_TEXT_MIN_FONT_SIZE,
                          );
                          const range = effectiveMax - LARGE_TEXT_MIN_FONT_SIZE;
                          if (range <= 0) {
                            setLargeTextBaseFontSize(effectiveMax);
                            return;
                          }
                          const newSize = Math.round(
                            LARGE_TEXT_MIN_FONT_SIZE + (range * clampedPercent) / 100,
                          );
                          setLargeTextBaseFontSize(newSize);
                        }}
                        className="h-1.5"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                        <span>Small text size</span>
                        <span>
                          {SMALL_TEXT_MAX_FONT_SIZE > 0
                            ? `${Math.round(
                                (smallTextFontSize / SMALL_TEXT_MAX_FONT_SIZE) * 100,
                              )}%`
                            : "0%"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={(() => {
                          const range = SMALL_TEXT_MAX_FONT_SIZE - SMALL_TEXT_MIN_FONT_SIZE;
                          if (range <= 0) {
                            return 100;
                          }
                          const clampedBase = Math.min(
                            Math.max(smallTextFontSize, SMALL_TEXT_MIN_FONT_SIZE),
                            SMALL_TEXT_MAX_FONT_SIZE,
                          );
                          return Math.round(
                            ((clampedBase - SMALL_TEXT_MIN_FONT_SIZE) / range) * 100,
                          );
                        })()}
                        onChange={(event) => {
                          const percent = Number(event.target.value);
                          if (!Number.isFinite(percent)) return;
                          const clampedPercent = Math.min(Math.max(percent, 0), 100);
                          const range = SMALL_TEXT_MAX_FONT_SIZE - SMALL_TEXT_MIN_FONT_SIZE;
                          if (range <= 0) {
                            setSmallTextFontSize(SMALL_TEXT_MAX_FONT_SIZE);
                            return;
                          }
                          const newSize = Math.round(
                            SMALL_TEXT_MIN_FONT_SIZE + (range * clampedPercent) / 100,
                          );
                          setSmallTextFontSize(newSize);
                        }}
                        className="h-1.5"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.2em] text-muted">Text colour</span>
                      <input
                        type="color"
                        value={textColor}
                        onChange={handleTextColorChange}
                        className="h-9 w-full cursor-pointer rounded-lg border border-border/40 bg-black/30 p-1"
                        aria-label="Text colour"
                      />
                    </label>
                  </div>
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
                            style={artworkStyle}
                            sizes="100vw"
                          />
                        ) : (
                          <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-muted">
                            Upload artwork to see the live preview.
                          </div>
                        )}
                        {totalWidthPx > 0 && (
                          <div
                            ref={largeTextContainerRef}
                            className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center justify-center text-center"
                            style={{
                              width: `${totalWidthPx}px`,
                              height: `${largeTextAreaHeightPx}px`,
                              top: `${topMarginPx}px`,
                            }}
                          >
                            <div
                              ref={largeTextRef}
                              className="max-w-full px-6 font-semibold tracking-[0.2em] text-foreground/90"
                              style={{
                                fontSize: `${largeTextFontSize}px`,
                                lineHeight: LARGE_TEXT_LINE_HEIGHT,
                                fontFamily: largeTextFontFamily,
                                color: textColor,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                overflow: "hidden",
                              }}
                            >
                              {largeText}
                            </div>
                          </div>
                        )}
                        <div
                          className="relative z-10 flex h-full items-start"
                          style={{ paddingTop: topMarginPx }}
                        >
                          {books.map((book, index) => {
                            const trimmedIsbn = book.isbn.trim();
                            const smallText = book.smallText.trim();
                            const spineWidthPx = mmToPx(book.spineWidth);
                            const jacketHeightPx = mmToPx(book.height);
                            const heightDifferencePx = maxHeightPx - topMarginPx - jacketHeightPx;

                            return (
                              <div
                                key={book.id}
                                className="flex flex-col items-center"
                                style={{ marginRight: index === books.length - 1 ? 0 : mmToPx(BOOK_GAP_MM) }}
                              >
                                <div
                                  className="relative flex h-full items-center justify-center overflow-hidden rounded border bg-foreground/5 shadow-lg shadow-black/40"
                                  style={{
                                    width: `${spineWidthPx}px`,
                                    height: `${jacketHeightPx}px`,
                                    marginTop: `${heightDifferencePx}px`,
                                    backgroundColor: `${book.color}33`,
                                    borderColor: book.color,
                                  }}
                                >
                                  {smallText.length > 0 ? (
                                    <div
                                      className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 justify-center text-center"
                                      style={{
                                        bottom: `${smallTextBottomOffsetPx}px`,
                                        width: "100%",
                                        maxWidth: "100%",
                                        boxSizing: "border-box",
                                        padding: "0 4px",
                                      }}
                                    >
                                      <span
                                        className="w-full break-words leading-tight text-foreground/90"
                                        style={{
                                          whiteSpace: "pre-wrap",
                                          wordBreak: "break-word",
                                          fontSize: `${smallTextFontSize}px`,
                                          fontFamily: largeTextFontFamily,
                                          color: textColor,
                                        }}
                                      >
                                        {smallText}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex flex-col items-center gap-1 text-center">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted">{`Book ${index + 1}`}</p>
                                  {trimmedIsbn.length > 0 ? (
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted/70">ISBN #{trimmedIsbn}</p>
                                  ) : null}
                                </div>
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
                {booksWithLayout.map(({ book, spineWidthPx, centerPx, jacketHeightPx }, index) => {
                  const hasArtwork = Boolean(image);
                  const pageCenterGuideWidthPx = spineWidthPx * pdfLayoutScale;
                  const guideWidthPx = Number.isFinite(pageCenterGuideWidthPx)
                    ? Math.max(pageCenterGuideWidthPx, 1)
                    : 1;
                  const pageCenterGuideHeightPx = jacketHeightPx * pdfLayoutScale;
                  const guideHeightPx = Number.isFinite(pageCenterGuideHeightPx)
                    ? Math.max(pageCenterGuideHeightPx, 1)
                    : 1;
                  const stackCenterPx = totalWidthPx / 2;
                  const rawCenterShiftPx = stackCenterPx - centerPx;
                  const centerShiftPx = Number.isFinite(rawCenterShiftPx) ? rawCenterShiftPx : 0;
                  const artworkShiftXPx = translateXPx + centerShiftPx;
                  const bookOutlineBottomFromCenterPx = jacketHeightPx / 2;
                  const pdfBaselineShiftPx = Number.isFinite(bookOutlineBottomFromCenterPx - bookBaselineFromCenterPx)
                    ? bookOutlineBottomFromCenterPx - bookBaselineFromCenterPx - topMarginPx
                    : 0;
                  const section4ArtworkStyle = section4ArtworkBaseStyle
                    ? {
                        ...section4ArtworkBaseStyle,
                        transform: `translate(-50%, -50%) translate(${artworkShiftXPx}px, ${translateYPx + pdfBaselineShiftPx}px)`,
                      }
                    : undefined;

                  const trimmedIsbn = book.isbn.trim();

                  return (
                    <div key={book.id} className="flex flex-col items-center gap-3">
                      <div className="flex w-full flex-wrap items-start justify-between gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                        <div className="flex flex-col">
                          <span className="font-semibold tracking-[0.25em] text-foreground/80">{`Book ${index + 1}`}</span>
                          {trimmedIsbn.length > 0 ? (
                            <span className="mt-1 text-[10px] tracking-[0.25em] text-muted/70">ISBN #{trimmedIsbn}</span>
                          ) : null}
                        </div>
                        <span>11×17&quot; spread</span>
                      </div>
                      <div className="flex w-full justify-center">
                        <div
                          className="relative overflow-hidden rounded-xl border border-border/30 bg-white shadow-lg shadow-black/20"
                          style={{ width: `${blankPagePreviewWidth}px`, height: `${blankPagePreviewHeight}px` }}
                        >
                          <div className="pointer-events-none absolute inset-4 rounded-lg border border-dashed border-border/40 bg-white/80" />
                          <div className="pointer-events-none absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-border/30" />
                          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                            <div
                              className="relative flex items-center justify-center overflow-hidden rounded border bg-foreground/10"
                              style={{
                                width: `${guideWidthPx}px`,
                                height: `${guideHeightPx}px`,
                                borderColor: book.color,
                                backgroundColor: `${book.color}22`,
                              }}
                            />
                          </div>
                          {hasArtwork ? (
                            <div className="absolute inset-0 z-10 flex items-center justify-center">
                              <div
                                className="relative"
                                style={{
                                  width: `${pdfScaledWidth}px`,
                                  height: `${pdfScaledHeight}px`,
                                }}
                              >
                                <div
                                  className="absolute left-0 top-0"
                                  style={{
                                    width: `${pdfLayoutBaseWidth}px`,
                                    height: `${pdfLayoutBaseHeight}px`,
                                    transformOrigin: "top left",
                                    transform: `scale(${pdfLayoutScale})`,
                                  }}
                                >
                                  <div
                                    className="relative h-full w-full overflow-hidden rounded-lg bg-white"
                                    style={previewBackdropStyle}
                                  >
                                    <Image
                                      src={image!.url}
                                      alt={`Dust jacket artwork for book ${index + 1}`}
                                      width={image!.width}
                                      height={image!.height}
                                      unoptimized
                                      className="pointer-events-none select-none"
                                      style={section4ArtworkStyle}
                                      sizes="100vw"
                                    />
                                    <div className="pointer-events-none absolute inset-0">
                                      <div
                                        className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center justify-center text-center"
                                        style={{
                                          width: `${totalWidthPx}px`,
                                          height: `${largeTextAreaHeightPx}px`,
                                          top: `${topMarginPx}px`,
                                        }}
                                      >
                                        <div
                                          className="max-w-full px-6 font-semibold tracking-[0.2em]"
                                          style={{
                                            fontSize: `${largeTextFontSize}px`,
                                            lineHeight: LARGE_TEXT_LINE_HEIGHT,
                                            fontFamily: largeTextFontFamily,
                                            color: textColor,
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            overflow: "hidden",
                                          }}
                                        >
                                          {largeText}
                                        </div>
                                      </div>
                                      <div
                                        className="absolute left-1/2 top-1/2 flex items-center"
                                        style={{
                                          width: `${totalWidthPx}px`,
                                          height: `${maxHeightPx}px`,
                                          transform: `translate(-50%, -50%) translate(${centerShiftPx}px, 0)`,
                                        }}
                                      >
                                        {booksWithLayout.map(
                                          (
                                            {
                                              book: layoutBook,
                                              spineWidthPx: layoutSpineWidthPx,
                                              jacketHeightPx: layoutJacketHeightPx,
                                            },
                                            layoutIndex,
                                          ) => {
                                            const isCurrentBook = layoutBook.id === book.id;
                                            const layoutIsbn = layoutBook.isbn.trim();
                                            const layoutSmallText = layoutBook.smallText.trim();

                                            return (
                                              <div
                                                key={layoutBook.id}
                                                aria-hidden={!isCurrentBook}
                                                className="flex flex-col items-center"
                                                style={{
                                                  marginRight:
                                                    layoutIndex === booksWithLayout.length - 1 ? 0 : bookGapPx,
                                                  visibility: isCurrentBook ? "visible" : "hidden",
                                                }}
                                              >
                                                <div
                                                  className="relative flex items-center justify-center overflow-hidden rounded border bg-foreground/5 shadow-lg shadow-black/40"
                                                  style={{
                                                    width: `${layoutSpineWidthPx}px`,
                                                    height: `${layoutJacketHeightPx}px`,
                                                    backgroundColor: `${layoutBook.color}33`,
                                                    borderColor: layoutBook.color,
                                                  }}
                                                >
                                                  {layoutSmallText.length > 0 ? (
                                                    <div
                                                      className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 justify-center text-center"
                                                      style={{
                                                        bottom: `${smallTextBottomOffsetPx}px`,
                                                        width: "100%",
                                                        maxWidth: "100%",
                                                        boxSizing: "border-box",
                                                        padding: "0 4px",
                                                      }}
                                                    >
                                                      <span
                                                        className="w-full break-words leading-tight text-foreground/90"
                                                        style={{
                                                          whiteSpace: "pre-wrap",
                                                          wordBreak: "break-word",
                                                          fontSize: `${smallTextFontSize}px`,
                                                          fontFamily: largeTextFontFamily,
                                                          color: textColor,
                                                        }}
                                                      >
                                                        {layoutSmallText}
                                                      </span>
                                                    </div>
                                                  ) : null}
                                                </div>
                                                <div
                                                  className={`mt-2 flex flex-col items-center gap-1 text-center ${
                                                    isCurrentBook ? "" : "opacity-0"
                                                  }`}
                                                >
                                                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted">
                                                    {`Book ${layoutIndex + 1}`}
                                                  </p>
                                                  {layoutIsbn.length > 0 ? (
                                                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted/70">
                                                      ISBN #{layoutIsbn}
                                                    </p>
                                                  ) : null}
                                                </div>
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                              Upload artwork to populate this page preview.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

      </main>
    </div>
  );
}
