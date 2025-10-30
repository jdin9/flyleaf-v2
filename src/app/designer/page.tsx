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
  title: string;
  isbn: string;
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
const BOOK_GAP_MM = 2;
const WRAP_MARGIN_CM = 2;
const WRAP_MARGIN_MM = WRAP_MARGIN_CM * 10;
const TOTAL_WRAP_ALLOWANCE_MM = WRAP_MARGIN_MM * 2;
const TOP_MARGIN_MM = 2;
const MM_TO_PX = 3.7795275591; // 96 DPI reference for converting mm to px
const SECTION_HORIZONTAL_PADDING_PX = 24; // Tailwind p-6
const LARGE_TEXT_OVERHANG_IN = 1;
const LARGE_TEXT_MAX_LINES = 3;
const LARGE_TEXT_MIN_FONT_SIZE = 16;
const LARGE_TEXT_DEFAULT_FONT_SIZE = 72;
const LARGE_TEXT_LINE_HEIGHT_MULTIPLIER = 1.15;

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
  title: "",
  isbn: "",
});

const mmToPx = (value: number) => value * MM_TO_PX;
const PAGE_WIDTH_IN = 17;
const PAGE_HEIGHT_IN = 11;
const INCH_TO_MM = 25.4;
const SMALL_TEXT_BOTTOM_OFFSET_IN = 0.5;
const SMALL_TEXT_BOTTOM_OFFSET_MM = SMALL_TEXT_BOTTOM_OFFSET_IN * INCH_TO_MM;
const SMALL_TEXT_MAX_LINES = 3;
const SMALL_TEXT_DEFAULT_FONT_SIZE = 11;
const SMALL_TEXT_MIN_FONT_SIZE = 8;
const SMALL_TEXT_LINE_HEIGHT_MULTIPLIER = 1.1;
const SMALL_TEXT_HORIZONTAL_PADDING_PX = 8; // tailwind px-1 on each side
const PAGE_WIDTH_MM = PAGE_WIDTH_IN * INCH_TO_MM;
const PAGE_HEIGHT_MM = PAGE_HEIGHT_IN * INCH_TO_MM;
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
  const [smallTextLayouts, setSmallTextLayouts] = useState<Record<
    number,
    { fontSize: number; lineHeight: number; lineCount: number }
  >>(() => ({}));
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const livePreviewSectionRef = useRef<HTMLElement | null>(null);
  const [previewBounds, setPreviewBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [livePreviewSectionBounds, setLivePreviewSectionBounds] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const searchParams = useSearchParams();
  const listingParam = searchParams?.get("listing");
  const smallTextMeasurementRef = useRef<HTMLDivElement | null>(null);

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

        if (field === "title" || field === "isbn") {
          return { ...book, [field]: rawValue };
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

  const bookGapPx = mmToPx(BOOK_GAP_MM);
  const largeTextOverhangPx = mmToPx(LARGE_TEXT_OVERHANG_IN * INCH_TO_MM);
  const largeTextVisibleWidthPx = Math.max(totalWidthPx, 1);
  const largeTextPdfFullWidthPx = useMemo(
    () => Math.max(totalWidthPx + largeTextOverhangPx * 2, 1),
    [largeTextOverhangPx, totalWidthPx],
  );
  const largeTextVisibleHeightPx = Math.max(maxHeightPx - topMarginPx, 1);
  const trimmedLargeText = largeText.trim();
  const shouldDisplayLargeText = trimmedLargeText.length > 0;
  const largeTextMeasurementRef = useRef<HTMLDivElement | null>(null);
  const [largeTextWarning, setLargeTextWarning] = useState<string | null>(null);
  const [largeTextLayout, setLargeTextLayout] = useState<{
    fontSize: number;
    lineHeight: number;
    lineCount: number;
  }>({
    fontSize: LARGE_TEXT_DEFAULT_FONT_SIZE,
    lineHeight: LARGE_TEXT_DEFAULT_FONT_SIZE * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER,
    lineCount: 0,
  });

  useLayoutEffect(() => {
    const measurementNode = largeTextMeasurementRef.current;

    if (!measurementNode) return;

    const targetWidth = largeTextVisibleWidthPx;
    const targetHeight = largeTextVisibleHeightPx;
    const text = trimmedLargeText;

    if (!text || !Number.isFinite(targetWidth) || targetWidth <= 0 || !Number.isFinite(targetHeight) || targetHeight <= 0) {
      setLargeTextLayout((current) => {
        if (
          current.lineCount === 0 &&
          current.fontSize === LARGE_TEXT_DEFAULT_FONT_SIZE &&
          current.lineHeight === LARGE_TEXT_DEFAULT_FONT_SIZE * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER
        ) {
          return current;
        }
        return {
          fontSize: LARGE_TEXT_DEFAULT_FONT_SIZE,
          lineHeight: LARGE_TEXT_DEFAULT_FONT_SIZE * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER,
          lineCount: 0,
        };
      });
      setLargeTextWarning(null);
    } else {
      const node = measurementNode;

      node.style.width = `${targetWidth}px`;
      node.style.fontSize = `${LARGE_TEXT_MIN_FONT_SIZE}px`;
      node.style.lineHeight = `${LARGE_TEXT_MIN_FONT_SIZE * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER}px`;

      const fits = (size: number) => {
        node.style.fontSize = `${size}px`;
        node.style.lineHeight = `${size * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER}px`;

        const scrollWidth = node.scrollWidth;
        const scrollHeight = node.scrollHeight;
        if (scrollWidth > targetWidth + 0.5) return false;

        const maxAllowedHeight = Math.min(
          targetHeight,
          size * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER * LARGE_TEXT_MAX_LINES,
        );

        if (scrollHeight > maxAllowedHeight + 0.5) {
          return false;
        }

        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
        range.detach?.();
        const computedLineHeight = size * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER;
        const estimatedLines = rects.length || Math.max(1, Math.round(scrollHeight / Math.max(computedLineHeight, 1)));

        return estimatedLines <= LARGE_TEXT_MAX_LINES;
      };

      let best = LARGE_TEXT_MIN_FONT_SIZE;
      let found = false;

      if (fits(LARGE_TEXT_DEFAULT_FONT_SIZE)) {
        best = LARGE_TEXT_DEFAULT_FONT_SIZE;
        found = true;
      } else {
        let low = LARGE_TEXT_MIN_FONT_SIZE;
        let high = Math.max(LARGE_TEXT_MIN_FONT_SIZE, LARGE_TEXT_DEFAULT_FONT_SIZE - 1);

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (fits(mid)) {
            best = mid;
            found = true;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
      }

      const finalSize = found ? best : LARGE_TEXT_MIN_FONT_SIZE;
      node.style.fontSize = `${finalSize}px`;
      node.style.lineHeight = `${finalSize * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER}px`;
      const finalHeight = node.scrollHeight;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      range.detach?.();
      const computedLineHeight = finalSize * LARGE_TEXT_LINE_HEIGHT_MULTIPLIER;
      const lines = rects.length || Math.max(1, Math.round(finalHeight / Math.max(computedLineHeight, 1)));
      const overflowed = !found || finalHeight > Math.min(targetHeight, computedLineHeight * LARGE_TEXT_MAX_LINES) + 0.5 || lines > LARGE_TEXT_MAX_LINES;

      setLargeTextLayout({
        fontSize: finalSize,
        lineHeight: computedLineHeight,
        lineCount: lines,
      });
      setLargeTextWarning(
        overflowed ? "Large text is too long to fit within three lines. Try shortening your message." : null,
      );
    }
  }, [largeTextVisibleHeightPx, largeTextVisibleWidthPx, trimmedLargeText]);

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

  useLayoutEffect(() => {
    const measurementContainer = smallTextMeasurementRef.current;
    if (!measurementContainer) return;

    const nextLayouts: Record<number, { fontSize: number; lineHeight: number; lineCount: number }> = {};

    books.forEach((book) => {
      const measurementNode = measurementContainer.querySelector<HTMLDivElement>(`[data-book-id="${book.id}"]`);
      const trimmedTitle = book.title.trim();
      const defaultLayout = {
        fontSize: SMALL_TEXT_DEFAULT_FONT_SIZE,
        lineHeight: SMALL_TEXT_DEFAULT_FONT_SIZE * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER,
        lineCount: trimmedTitle.length > 0 ? 1 : 0,
      };

      if (!measurementNode || trimmedTitle.length === 0) {
        nextLayouts[book.id] = defaultLayout;
        return;
      }

      const targetWidth = Math.max(mmToPx(book.spineWidth) - SMALL_TEXT_HORIZONTAL_PADDING_PX, 1);

      measurementNode.style.width = `${targetWidth}px`;
      measurementNode.style.fontSize = `${SMALL_TEXT_MIN_FONT_SIZE}px`;
      measurementNode.style.lineHeight = `${SMALL_TEXT_MIN_FONT_SIZE * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER}px`;

      const fits = (size: number) => {
        measurementNode.style.fontSize = `${size}px`;
        measurementNode.style.lineHeight = `${size * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER}px`;

        const scrollWidth = measurementNode.scrollWidth;
        if (scrollWidth > targetWidth + 0.5) return false;

        const scrollHeight = measurementNode.scrollHeight;
        const maxAllowedHeight = size * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER * SMALL_TEXT_MAX_LINES;
        if (scrollHeight > maxAllowedHeight + 0.5) return false;

        const range = document.createRange();
        range.selectNodeContents(measurementNode);
        const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
        range.detach?.();
        const computedLineHeight = size * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER;
        const estimatedLines = rects.length || Math.max(1, Math.round(scrollHeight / Math.max(computedLineHeight, 1)));

        return estimatedLines <= SMALL_TEXT_MAX_LINES;
      };

      let best = SMALL_TEXT_MIN_FONT_SIZE;
      let found = false;

      if (fits(SMALL_TEXT_DEFAULT_FONT_SIZE)) {
        best = SMALL_TEXT_DEFAULT_FONT_SIZE;
        found = true;
      } else {
        let low = SMALL_TEXT_MIN_FONT_SIZE;
        let high = Math.max(SMALL_TEXT_MIN_FONT_SIZE, SMALL_TEXT_DEFAULT_FONT_SIZE - 1);

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (fits(mid)) {
            best = mid;
            found = true;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
      }

      const finalSize = found ? best : SMALL_TEXT_MIN_FONT_SIZE;
      measurementNode.style.fontSize = `${finalSize}px`;
      measurementNode.style.lineHeight = `${finalSize * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER}px`;

      const finalHeight = measurementNode.scrollHeight;
      const range = document.createRange();
      range.selectNodeContents(measurementNode);
      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      range.detach?.();
      const computedLineHeight = finalSize * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER;
      const lines = rects.length || Math.max(1, Math.round(finalHeight / Math.max(computedLineHeight, 1)));

      nextLayouts[book.id] = {
        fontSize: finalSize,
        lineHeight: computedLineHeight,
        lineCount: lines,
      };
    });

    setSmallTextLayouts((current) => {
      let changed = false;

      if (Object.keys(current).length !== books.length) {
        changed = true;
      }

      if (!changed) {
        for (const book of books) {
          const nextLayout = nextLayouts[book.id];
          const currentLayout = current[book.id];

          if (!nextLayout && !currentLayout) continue;
          if (!nextLayout || !currentLayout) {
            changed = true;
            break;
          }

          if (
            nextLayout.fontSize !== currentLayout.fontSize ||
            nextLayout.lineHeight !== currentLayout.lineHeight ||
            nextLayout.lineCount !== currentLayout.lineCount
          ) {
            changed = true;
            break;
          }
        }
      }

      if (!changed) return current;

      const sanitized: Record<number, { fontSize: number; lineHeight: number; lineCount: number }> = {};
      books.forEach((book) => {
        const layout = nextLayouts[book.id];
        if (layout) {
          sanitized[book.id] = layout;
        } else {
          sanitized[book.id] = {
            fontSize: SMALL_TEXT_DEFAULT_FONT_SIZE,
            lineHeight: SMALL_TEXT_DEFAULT_FONT_SIZE * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER,
            lineCount: 0,
          };
        }
      });

      return sanitized;
    });
  }, [books]);

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

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted/80">Large Text</span>
              <textarea
                value={largeText}
                onChange={(event) => setLargeText(event.target.value)}
                className="min-h-[88px] w-full rounded-lg border border-border/40 bg-black/30 px-3 py-2 text-foreground focus:border-foreground/60 focus:outline-none"
                placeholder="Optional"
              />
              {largeTextWarning ? (
                <p className="text-xs text-amber-300" aria-live="polite">
                  {largeTextWarning}
                </p>
              ) : null}
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
                    <label className="col-span-2 flex flex-col gap-1">
                      <span className="text-muted/80">Short Text</span>
                      <input
                        type="text"
                        value={book.title}
                        onChange={(event) => updateBook(book.id, "title", event.target.value)}
                        className="w-full rounded-lg border border-border/40 bg-black/30 px-2 py-1 text-foreground focus:border-foreground/60 focus:outline-none"
                        placeholder="Optional"
                      />
                    </label>
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
                        {shouldDisplayLargeText ? (
                          <div
                            className="pointer-events-none absolute left-0 z-30"
                            style={{
                              top: `${topMarginPx}px`,
                              width: `${totalWidthPx}px`,
                              height: `${largeTextVisibleHeightPx}px`,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              className="absolute left-1/2 top-1/2 flex h-full items-center justify-center"
                              style={{
                                width: `${largeTextVisibleWidthPx}px`,
                                height: `${largeTextVisibleHeightPx}px`,
                                transform: "translate(-50%, -50%)",
                              }}
                            >
                              <span
                                className="w-full text-center font-semibold tracking-[0.3em] text-foreground"
                                style={{
                                  fontSize: `${largeTextLayout.fontSize}px`,
                                  lineHeight: `${largeTextLayout.lineHeight}px`,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {trimmedLargeText}
                              </span>
                            </div>
                          </div>
                        ) : null}
                        <div
                          className="relative z-10 flex h-full items-start"
                          style={{ paddingTop: topMarginPx }}
                        >
                          {books.map((book, index) => {
                            const trimmedTitle = book.title.trim();
                            const displayTitle = trimmedTitle.length ? trimmedTitle : `Book ${index + 1}`;
                            const trimmedIsbn = book.isbn.trim();
                            const spineWidthPx = mmToPx(book.spineWidth);
                            const jacketHeightPx = mmToPx(book.height);
                            const heightDifferencePx = maxHeightPx - topMarginPx - jacketHeightPx;
                            const smallTextLayout = smallTextLayouts[book.id];
                            const smallTextFontSize = smallTextLayout?.fontSize ?? SMALL_TEXT_DEFAULT_FONT_SIZE;
                            const smallTextLineHeight =
                              smallTextLayout?.lineHeight ??
                              SMALL_TEXT_DEFAULT_FONT_SIZE * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER;
                            const smallTextContentWidthPx = Math.max(
                              spineWidthPx - SMALL_TEXT_HORIZONTAL_PADDING_PX,
                              1,
                            );

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
                                  {trimmedTitle.length > 0 ? (
                                    <div
                                      className="pointer-events-none absolute left-0 right-0 flex justify-center px-1 text-center"
                                      style={{ bottom: `${mmToPx(SMALL_TEXT_BOTTOM_OFFSET_MM)}px` }}
                                    >
                                      <span
                                        className="select-none font-semibold uppercase tracking-[0.3em] text-foreground"
                                        style={{
                                          fontSize: `${smallTextFontSize}px`,
                                          lineHeight: `${smallTextLineHeight}px`,
                                          overflowWrap: "anywhere",
                                          wordBreak: "break-word",
                                          whiteSpace: "pre-wrap",
                                          display: "inline-block",
                                          maxWidth: `${smallTextContentWidthPx}px`,
                                        }}
                                      >
                                        {trimmedTitle}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex flex-col items-center gap-1 text-center">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted">{displayTitle}</p>
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
                {booksWithLayout.map(({ book, spineWidthPx, centerPx }, index) => {
                  const hasArtwork = Boolean(image);
                  const pageCenterGuideWidthPx = spineWidthPx * pdfLayoutScale;
                  const guideWidthPx = Number.isFinite(pageCenterGuideWidthPx)
                    ? Math.max(pageCenterGuideWidthPx, 1)
                    : 1;
                  const guideHeightPx = Math.max(blankPagePreviewHeight, 1);
                  const stackCenterPx = totalWidthPx / 2;
                  const rawCenterShiftPx = stackCenterPx - centerPx;
                  const centerShiftPx = Number.isFinite(rawCenterShiftPx) ? rawCenterShiftPx : 0;
                  const artworkShiftXPx = translateXPx + centerShiftPx;
                  const section4ArtworkStyle = section4ArtworkBaseStyle
                    ? {
                        ...section4ArtworkBaseStyle,
                        transform: `translate(-50%, -50%) translate(${artworkShiftXPx}px, ${translateYPx}px)`,
                      }
                    : undefined;

                  const trimmedTitle = book.title.trim();
                  const displayTitle = trimmedTitle.length ? trimmedTitle : `Book ${index + 1}`;
                  const trimmedIsbn = book.isbn.trim();
                  const smallTextLayout = smallTextLayouts[book.id];
                  const smallTextFontSize = smallTextLayout?.fontSize ?? SMALL_TEXT_DEFAULT_FONT_SIZE;
                  const smallTextLineHeight =
                    smallTextLayout?.lineHeight ??
                    SMALL_TEXT_DEFAULT_FONT_SIZE * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER;
                  const smallTextContentWidthPx = Math.max(
                    spineWidthPx - SMALL_TEXT_HORIZONTAL_PADDING_PX,
                    1,
                  );

                  return (
                    <div key={book.id} className="flex flex-col items-center gap-3">
                      <div className="flex w-full flex-wrap items-start justify-between gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                        <div className="flex flex-col">
                          <span className="font-semibold tracking-[0.25em] text-foreground/80">{displayTitle}</span>
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
                            >
                              {trimmedTitle.length > 0 ? (
                                <div
                                  className="pointer-events-none absolute left-0 right-0 flex justify-center px-1 text-center"
                                  style={{ bottom: `${mmToPx(SMALL_TEXT_BOTTOM_OFFSET_MM)}px` }}
                                >
                                  <span
                                    className="select-none font-semibold uppercase tracking-[0.3em] text-foreground"
                                    style={{
                                      fontSize: `${smallTextFontSize}px`,
                                      lineHeight: `${smallTextLineHeight}px`,
                                      overflowWrap: "anywhere",
                                      wordBreak: "break-word",
                                      whiteSpace: "pre-wrap",
                                      display: "inline-block",
                                      maxWidth: `${smallTextContentWidthPx}px`,
                                    }}
                                  >
                                    {trimmedTitle}
                                  </span>
                                </div>
                              ) : null}
                            </div>
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
                                      {shouldDisplayLargeText ? (
                                        <div
                                          className="absolute left-1/2 top-1/2 flex items-center justify-center"
                                          style={{
                                            width: `${largeTextPdfFullWidthPx}px`,
                                            height: `${largeTextVisibleHeightPx}px`,
                                            transform: `translate(-50%, -50%) translate(${centerShiftPx}px, 0)`,
                                          }}
                                        >
                                          <div
                                            className="flex h-full items-center justify-center"
                                            style={{ width: `${largeTextVisibleWidthPx}px` }}
                                          >
                                            <span
                                              className="w-full text-center font-semibold tracking-[0.3em] text-foreground"
                                              style={{
                                                fontSize: `${largeTextLayout.fontSize}px`,
                                                lineHeight: `${largeTextLayout.lineHeight}px`,
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                              }}
                                            >
                                              {trimmedLargeText}
                                            </span>
                                          </div>
                                        </div>
                                      ) : null}
                                      <div
                                        className="absolute left-1/2 top-1/2 flex items-center"
                                        style={{
                                          width: `${totalWidthPx}px`,
                                          height: `${pdfLayoutBaseHeight}px`,
                                          transform: `translate(-50%, -50%) translate(${centerShiftPx}px, 0)`,
                                        }}
                                      >
                                        {booksWithLayout.map(
                                          (
                                            {
                                              book: layoutBook,
                                              spineWidthPx: layoutSpineWidthPx,
                                            },
                                            layoutIndex,
                                          ) => {
                                            const isCurrentBook = layoutBook.id === book.id;
                                            const layoutTitle = layoutBook.title.trim();
                                            const layoutDisplayTitle = layoutTitle.length
                                              ? layoutTitle
                                              : `Book ${layoutIndex + 1}`;
                                            const layoutIsbn = layoutBook.isbn.trim();
                                            const layoutSmallTextLayout = smallTextLayouts[layoutBook.id];
                                            const layoutSmallTextFontSize =
                                              layoutSmallTextLayout?.fontSize ?? SMALL_TEXT_DEFAULT_FONT_SIZE;
                                            const layoutSmallTextLineHeight =
                                              layoutSmallTextLayout?.lineHeight ??
                                              SMALL_TEXT_DEFAULT_FONT_SIZE * SMALL_TEXT_LINE_HEIGHT_MULTIPLIER;
                                            const layoutSmallTextContentWidthPx = Math.max(
                                              layoutSpineWidthPx - SMALL_TEXT_HORIZONTAL_PADDING_PX,
                                              1,
                                            );

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
                                                  className="relative flex h-full items-center justify-center overflow-hidden rounded border bg-foreground/5 shadow-lg shadow-black/40"
                                                  style={{
                                                    width: `${layoutSpineWidthPx}px`,
                                                    height: `${pdfLayoutBaseHeight}px`,
                                                    backgroundColor: `${layoutBook.color}33`,
                                                    borderColor: layoutBook.color,
                                                  }}
                                                >
                                                  {layoutTitle.length > 0 ? (
                                                    <div
                                                      className="pointer-events-none absolute left-0 right-0 flex justify-center px-1 text-center"
                                                      style={{ bottom: `${mmToPx(SMALL_TEXT_BOTTOM_OFFSET_MM)}px` }}
                                                    >
                                                      <span
                                                        className="select-none font-semibold uppercase tracking-[0.3em] text-foreground"
                                                        style={{
                                                          fontSize: `${layoutSmallTextFontSize}px`,
                                                          lineHeight: `${layoutSmallTextLineHeight}px`,
                                                          overflowWrap: "anywhere",
                                                          wordBreak: "break-word",
                                                          whiteSpace: "pre-wrap",
                                                          display: "inline-block",
                                                          maxWidth: `${layoutSmallTextContentWidthPx}px`,
                                                        }}
                                                      >
                                                        {layoutTitle}
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
                                                    {layoutDisplayTitle}
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
      <div
        ref={smallTextMeasurementRef}
        aria-hidden
        className="pointer-events-none select-none font-semibold uppercase tracking-[0.3em]"
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          visibility: "hidden",
        }}
      >
        {books.map((book) => {
          const trimmedTitle = book.title.trim();
          const measurementWidth = Math.max(
            mmToPx(book.spineWidth) - SMALL_TEXT_HORIZONTAL_PADDING_PX,
            1,
          );

          return (
            <div
              key={book.id}
              data-book-id={book.id}
              style={{
                width: `${measurementWidth}px`,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {trimmedTitle || " "}
            </div>
          );
        })}
      </div>
      <div
        ref={largeTextMeasurementRef}
        aria-hidden
        className="pointer-events-none font-semibold tracking-[0.3em] text-center"
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: `${largeTextVisibleWidthPx}px`,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          visibility: "hidden",
        }}
      >
        {trimmedLargeText || " "}
      </div>
    </div>
  );
}
