# Portfolio 2026

Fresh redesign of Amanda Smith’s portfolio. Sibling of `portfolio_2024` (reference only).

**Stack (scaffold):** Next.js App Router · TypeScript · Tailwind CSS  
**Planned:** Sanity.io · admin drag-and-drop grid · holistic translate API  

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

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` → `.env.local` and fill values when a Sanity project exists. Do not commit secrets.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Environment

See `.env.example`. Placeholders only — create a real Sanity project before wiring CMS:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_READ_TOKEN` (server-only, if needed)
- `GOOGLE_TRANSLATE_API_KEY` (or equivalent; server-only)

## Scope of this scaffold

Minimal app shell only. Grid, intro mask, hazy menu, Sanity schemas, and DnD are **not** implemented yet — see the phased plan.
