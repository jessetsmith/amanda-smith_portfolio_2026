# Portfolio 2026

Fresh redesign of Amanda Smith’s portfolio. Sibling of `portfolio_2024` (reference only).

**Stack:** Next.js App Router · TypeScript · Tailwind CSS  
**Phase 1:** CSS tokens, fixture-driven **4-col** staggered grid, connected lines on scroll  
**Admin (early):** custom `/admin` with DnD + live preview against local fixtures (no Sanity yet)  
**Planned:** Sanity.io · intro video mask · holistic translate  

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

## Admin (local fixture editing)

1. Start the dev server (port **3456** if following the usual local setup).
2. Open [http://localhost:3456/admin](http://localhost:3456/admin) — redirects to login if needed.
3. Sign in with placeholder credentials:
   - **Username:** `admin`
   - **Password:** `admin`  
   (Override via `ADMIN_USER` / `ADMIN_PASSWORD` in `.env.local`.)

### What you can edit

- Reorder cells (drag-and-drop)
- `colStart` / `colSpan` (1–4), `rowSpan`
- Color `fill` / labels, text headlines & excerpts, project titles, media captions
- Add / remove / duplicate cell kinds (`titleRow`, `colorCell`, `mediaCell`, `textCell`, `projectCell`)
- Live preview updates as you edit; public `/` reads the same store

Edits persist to `.data/homepage-grid.json` (gitignored). **Reset seed** in the admin bar restores `src/data/homepage-grid.json`.

This is **not** production auth — cookie session mock only until Sanity + real auth land.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Phase 1 layout

- Fixture data: `src/data/homepage-grid.json` (`colSpan` 1–4)
- Runtime edits: `.data/homepage-grid.json` (via `/api/homepage-grid`)
- Grid types: `src/types/grid.ts` (`GRID_COLUMNS = 4`)
- Public grid: `src/components/grid/HomepageGrid.tsx` + `GridCell.tsx`
- Admin: `src/app/admin/` + `src/components/admin/AdminGridApp.tsx`
- Tokens / connected lines: `src/app/globals.css`

Max 4 columns; row mixes vary (full, halves, 1+3, 3+1, up to four equal).

## Environment

See `.env.example`. Placeholders only — create a real Sanity project before wiring CMS:

- `ADMIN_USER` / `ADMIN_PASSWORD` (local admin gate)
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_READ_TOKEN` (server-only, if needed)
- `GOOGLE_TRANSLATE_API_KEY` (or equivalent; server-only)
