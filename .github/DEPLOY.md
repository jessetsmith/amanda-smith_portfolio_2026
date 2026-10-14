# Deploy (GitHub Actions → GitHub Pages)

Public site is a **static export** hosted on **GitHub Pages** (custom domain).

## Live URLs

| URL | Notes |
| --- | --- |
| https://portfolio.bittersweetwoman.com/ | Custom domain (DNS already pointed at GitHub; `public/CNAME`) |
| https://jessetsmith.github.io/amanda-smith_portfolio_2026/ | github.io fallback (only if Pages is served from project site without custom domain) |

Deploy workflow: `.github/workflows/deploy-pages.yml` (push to `main` or manual dispatch).

## What is / isn’t on Pages

| Included (static) | Local / Studio only (excluded from export) |
| --- | --- |
| `/`, `/cv`, public media | `/admin`, `/studio`, `/api/*`, middleware auth |

CMS edits: use local `npm run dev` + `/admin`, or Sanity Studio. Re-deploy (push to `main`) to refresh the public static snapshot.

**Hero poster / background image:** upload in Admin → Hero (or Studio → Homepage hero). Uploads go to **Sanity assets** (`cdn.sanity.io`). Local `/media/uploads/…` paths are not deployed to Pages — always prefer Sanity for production stills.

## Exact GitHub secrets / vars Jesse should set

Repo → **Settings → Secrets and variables → Actions**:

| Name | Type | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | **Secret** (or Variable) | Bake Sanity project into the static build |
| `SANITY_API_READ_TOKEN` | **Secret** | Server-side read at build time (not exposed as `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SANITY_DATASET` | **Variable** (optional) | Defaults to `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | **Variable** (optional) | Defaults to `2025-01-01` |

Without the Sanity project id, the build still succeeds using **fixtures**.

Vercel secrets (`VERCEL_*`) are unused — safe to delete.

## Enable Pages (if needed)

Already configured for this repo (`build_type: workflow`, CNAME `portfolio.bittersweetwoman.com`). If Actions can’t publish:

1. Repo → **Settings → Pages**
2. **Source:** GitHub Actions
3. Confirm custom domain `portfolio.bittersweetwoman.com` + HTTPS

## Local commands

```bash
npm run build:pages   # writes ./out (stashes admin/api/studio during build)
npx serve out         # optional preview of static site
```
