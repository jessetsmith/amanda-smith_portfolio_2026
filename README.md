# Portfolio 2026

Fresh redesign of Amanda Smith’s portfolio. Sibling of `portfolio_2024` (reference only).

**Stack:** Next.js App Router · TypeScript · Tailwind CSS · Sanity (scaffolded)  
**Live locally:** 4-col grid, fixture `/admin`, Vermeer intro, hazy nav, CV, self-hosted i18n (EN/ES/IT/PT/FR/DE)  

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

## Admin

1. Seed login once: `npm run sanity:seed-admin` (writes bcrypt hash to Sanity `adminAuth`; prints password once).
2. Open `/admin` and sign in with those credentials.
3. **Change password** (while logged in): header → Change password → current + new + confirm (bcrypt hash updated in Sanity).
4. CLI rotate (no session): `ADMIN_SEED_PASSWORD='…' npm run sanity:seed-admin`
5. Reorder (DnD), edit spans (1–4), fill/copy, add/remove/duplicate.
6. Live preview updates immediately; saves patch Sanity `homepage.gridItems` (same doc Studio uses). Public `/` refetches after `revalidatePath`.
7. `.data/` is only a mirror/fallback if Sanity is unavailable.

Do **not** put plaintext passwords in Studio — the `passwordHash` field is read-only. Optional emergency bootstrap: `ADMIN_USER` / `ADMIN_PASSWORD` env — used only when the Sanity doc is missing.

## Sanity

Schemas live in `src/sanity/schemaTypes` (`project`, `publication`, `researchItem`, `cv`, `homepage`, `homepageHero`, `siteSettings`, `uiCopy`, 4-col `gridItem`, `localeString` / `localeText`). Studio mounts at `/studio` via `sanity.config.ts`.

**Without real IDs:** leave `NEXT_PUBLIC_SANITY_PROJECT_ID` empty — `/studio` shows a setup message; public + `/admin` keep using fixtures / `.data`.

**With a real project:** set in `.env.local` (gitignored — never commit tokens):

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_READ_TOKEN` (and optionally `SANITY_API_WRITE_TOKEN` for seeding)

Then restart the dev server. Seed fixtures once with `npm run sanity:seed`, then locale overlays with `npm run sanity:seed-i18n`. Homepage/CV/nav fetch Sanity when configured, else fall back (fixtures still apply authored overlays from `src/data/i18n/translations.json`).

### Languages (self-hosted)

- Navbar **language dropdown** (EN / ES / IT / PT / FR / DE); choice persists in `localStorage`.
- Missing locale strings fall back to **English**.
- **Studio:** open Homepage hero, Site settings, Homepage (grid), CV, or **UI copy (translations)**. Localized fields show a **Language** dropdown — switch locale, edit that language’s copy.
- **Admin:** Hero + Content editors include an **Editing language** switcher; full multi-locale polish is easiest in Studio.
- Re-seed translations: `npm run sanity:seed-i18n`

## Intro / chrome

- Full-bleed intro video: `public/media/intro.mp4` (placeholder from 2024 banner)
- Scroll text mask punches through video to an under-layer
- Hazy nav clears on hover/focus; definition tooltips on selected phrases
- Language dropdown switches Sanity/fixture locale copy for the session (no paid translate API)

## Environment

See `.env.example`. Do not invent production Sanity credentials.

## CI / deploy (GitHub Actions → Vercel)

Production is **Vercel** (full Next.js) so **`/admin`** and `/api/*` work.

- **Site (after DNS):** [https://portfolio.bittersweetwoman.com/](https://portfolio.bittersweetwoman.com/)
- **Admin (after DNS):** [https://portfolio.bittersweetwoman.com/admin](https://portfolio.bittersweetwoman.com/admin)
- **Works now:** [https://amanda-smith-portfolio-2026.vercel.app/admin](https://amanda-smith-portfolio-2026.vercel.app/admin)
- **CI / deploy:** `.github/workflows/ci.yml` + `deploy-vercel.yml`

**DNS:** point `portfolio` CNAME at Vercel (see [`.github/DEPLOY.md`](.github/DEPLOY.md)) — it still points at GitHub Pages until Jesse updates it.

**Hero stills:** Admin → Hero uploads go to Sanity CDN (`cdn.sanity.io`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (full app incl. admin/API) |
| `npm run build` | Node production build |
| `npm run build:pages` | Static export for GitHub Pages (`out/`) |
| `npm run start` | Serve Node production build |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
