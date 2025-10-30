# Flyleaf Frames Designer

Flyleaf Frames is a Next.js application for composing and exporting custom dust jackets. This iteration introduces the
interactive designer workspace with live previews sized to real-world measurements.

## Getting started

```bash
npm install
npm run dev
```

The designer is available at [http://localhost:3000/designer](http://localhost:3000/designer).

## Key features

- **Decisions log** — Architectural and product choices are tracked in `docs/decisions.md` for future contributors.
- **Four-section designer layout** — Book details, design dashboard, live preview, and PDF staging areas.
- **Millimetre-accurate previews** — Book outlines are rendered using mm-to-pixel conversion and spaced 2 mm apart.
- **Artwork handling** — Upload JPEG or PNG files, validate for 11"×17" at 300 DPI (3300×5100 px) minimum, and manipulate zoom/offset.
- **Scalable collection** — Manage up to 50 books with individual spine, cover width, height, and colour controls.

## Next steps

- Persist uploads and configurations to enable multi-session editing.
- Power the PDF preview section with generated proofs.
- Expand the design dashboard with vertical alignment, bleed, and template overlays.
