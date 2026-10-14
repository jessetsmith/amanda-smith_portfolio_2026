# Portfolio 2026

Fresh redesign of Amanda Smith’s portfolio. Sibling of `portfolio_2024` (reference only).

**Stack:** Next.js App Router · TypeScript · Tailwind CSS · Sanity (scaffolded)  
**Live locally:** 4-col grid, fixture `/admin`, Vermeer intro, hazy nav, CV, translate stub  

Build plan (project store): `docs/portfolio-2026-plan.md`

## Requirements

- Node.js 20+ recommended
- npm (comes with Node)

## Setup

```bash
cd ~/Desktop/Projects/Amanda-Portfolio/portfolio_2026
npm install
cp .env.example .env.local
npx next dev --port 3456
```

Open [http://localhost:3456](http://localhost:3456).

## URLs (local)

| Surface | URL |
| --- | --- |
| Public | http://localhost:3456 |
| Admin | http://localhost:3456/admin |
| Studio | http://localhost:3456/studio |
| CV | http://localhost:3456/cv |

## Admin (fixture editing)

1. Open `/admin` (redirects to login if needed).
2. Sign in: **`admin` / `admin`** (`ADMIN_USER` / `ADMIN_PASSWORD` override in `.env.local`).
3. Reorder (DnD), edit spans (1–4), fill/copy, add/remove/duplicate.
4. Live preview updates immediately; saves patch Sanity `homepage.gridItems` (same doc Studio uses). Public `/` refetches after `revalidatePath`.
5. `.data/` is only a mirror/fallback if Sanity is unavailable.

Not production auth — cookie mock until real auth.

## Sanity

Schemas live in `src/sanity/schemaTypes` (`project`, `publication`, `researchItem`, `cv`, `homepage`, `siteSettings`, 4-col `gridItem`). Studio mounts at `/studio` via `sanity.config.ts`.

**Without real IDs:** leave `NEXT_PUBLIC_SANITY_PROJECT_ID` empty — `/studio` shows a setup message; public + `/admin` keep using fixtures / `.data`.

**With a real project:** set in `.env.local` (gitignored — never commit tokens):

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_READ_TOKEN` (and optionally `SANITY_API_WRITE_TOKEN` for seeding)

Then restart the dev server. Seed fixtures once with `npm run sanity:seed`. Homepage/CV/nav fetch Sanity when configured, else fall back.

## Intro / chrome

- Full-bleed intro video: `public/media/intro.mp4` (placeholder from 2024 banner)
- Scroll text mask punches through video to an under-layer
- Hazy nav clears on hover/focus; definition tooltips on selected phrases
- Language control calls `/api/translate` (stub without `GOOGLE_TRANSLATE_API_KEY`)

## Environment

See `.env.example`. Do not invent production Sanity credentials.

## CI / deploy (GitHub Actions → GitHub Pages)

- **Live:** [https://portfolio.bittersweetwoman.com/](https://portfolio.bittersweetwoman.com/) (`public/CNAME`)
- **CI:** `.github/workflows/ci.yml` — typecheck + static export on push/PR
- **Deploy:** `.github/workflows/deploy-pages.yml` — build `out/` and publish to Pages on `main`

Public site is a **static export**. `/admin`, `/studio`, and `/api/*` stay **local-only** (excluded from the Pages build). Full steps + secrets: [`.github/DEPLOY.md`](.github/DEPLOY.md).

**Hero stills for production:** set Video poster / Background image in Admin → Hero (uploads to Sanity CDN) or Studio → Homepage hero image fields. Do not rely on `/media/uploads/…` for Pages — those files are gitignored and won’t ship.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (full app incl. admin/API) |
| `npm run build` | Node production build |
| `npm run build:pages` | Static export for GitHub Pages (`out/`) |
| `npm run start` | Serve Node production build |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
