# Portfolio 2026

Fresh redesign of Amanda Smith’s portfolio. Sibling of `portfolio_2024` (reference only).

**Stack:** Next.js App Router · TypeScript · Tailwind CSS  
**Phase 1:** CSS tokens, fixture-driven **4-col** staggered grid, connected lines on scroll  
**Planned:** Sanity.io · custom `/admin` DnD · intro video mask · holistic translate  

Build plan (project store): `docs/portfolio-2026-plan.md`

## Requirements

- Node.js 20+ recommended
- npm (comes with Node)

## Setup

```bash
cd ~/Desktop/Projects/Amanda-Portfolio/portfolio_2026
npm install
cp .env.example .env.local
npm run dev
```

Default Next port is 3000. For a quieter local port:

```bash
npx next dev --port 3456
```

Open the URL printed in the terminal (e.g. [http://localhost:3456](http://localhost:3456)).

Copy `.env.example` → `.env.local` and fill values when a Sanity project exists. Do not commit secrets.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Phase 1 layout

- Fixture data: `src/data/homepage-grid.json` (`colSpan` 1–4)
- Grid types: `src/types/grid.ts` (`GRID_COLUMNS = 4`)
- Public grid: `src/components/grid/HomepageGrid.tsx` + `GridCell.tsx`
- Tokens / connected lines: `src/app/globals.css`

Max 4 columns; row mixes vary (full, halves, 1+3, 3+1, up to four equal). Mock JSON only — no live Sanity yet (Phase 2).

## Environment

See `.env.example`. Placeholders only — create a real Sanity project before wiring CMS:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_READ_TOKEN` (server-only, if needed)
- `GOOGLE_TRANSLATE_API_KEY` (or equivalent; server-only)
