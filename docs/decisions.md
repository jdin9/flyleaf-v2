# Decisions Log

## 2025-10-21
- Adopted Next.js 15 App Router with TypeScript and Tailwind CSS v4 for rapid iteration on the design tooling interface.
- Established `/designer` as the primary entry point for the dust jacket builder while keeping `/` available for future marketing content.
- Image uploads remain client-side for now; introduced a minimum resolution check of 3300×5100 pixels (11"×17" at 300 DPI) to ensure print-ready assets.
- Book dimension inputs follow millimetres to mirror printer specifications; cover width includes the front or back panel measurement and is doubled when rendering full jackets.
- Added vertical offset controls and auto-scaling for the live preview so multi-book layouts stay visible without requiring constant scrolling.
- Ensured the live preview retains a dedicated, always-visible canvas beside the form, adding a subtle grid backdrop so the layout remains informative even before artwork is uploaded.
- Reworked the designer layout into a three-column grid and sized the live preview responsively against its container so the right-hand canvas stays visible alongside the controls.
- Removed stock SVG assets from `public/` to keep the repository text-only until we introduce custom artwork exports, preventing binary upload blockers in future PRs.
- Removed the default `favicon.ico` so the repository contains no binary blobs, keeping automated PR tooling happy.
