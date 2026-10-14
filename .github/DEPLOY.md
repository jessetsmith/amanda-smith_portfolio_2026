# Deploy (GitHub Actions → Vercel)

Production is **Vercel** (full Next.js) so **`/admin`**, `/api/*`, and Sanity writes work.

GitHub Pages static export **cannot** host admin (no Route Handlers). The Pages workflow is optional / non-production only.

## Live URLs

| URL | Notes |
| --- | --- |
| https://portfolio.bittersweetwoman.com/ | Custom domain (after DNS points at Vercel) |
| https://portfolio.bittersweetwoman.com/admin | Admin (same host) |
| https://amanda-smith-portfolio-2026.vercel.app/ | Works **now** (before DNS cutover) |
| https://amanda-smith-portfolio-2026.vercel.app/admin | Admin on Vercel alias |

## DNS click Jesse must do (Google Domains / Cloud DNS)

`portfolio.bittersweetwoman.com` currently CNAMEs to **GitHub Pages** (`bittersweetwoman.github.io`). Change it to Vercel:

| Type | Host / name | Value |
| --- | --- | --- |
| **CNAME** | `portfolio` | `6ef570c297b0004c.vercel-dns-017.com.` |

Fallback (also accepted by Vercel): `cname.vercel-dns.com.`

Leave apex `bittersweetwoman.com` alone unless you intend to move the whole site.

After DNS propagates, https://portfolio.bittersweetwoman.com/admin should hit Vercel (not GitHub 404).

Verify: `dig +short portfolio.bittersweetwoman.com CNAME`

## GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Required | Notes |
| --- | --- | --- |
| `VERCEL_TOKEN` | **Yes — Jesse must add** | https://vercel.com/account/tokens (CLI cannot mint team tokens here) |
| `VERCEL_ORG_ID` | Set | Team id from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Set | Project id from `.vercel/project.json` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Set | Public |
| `SANITY_API_READ_TOKEN` | Set | Server |
| `SANITY_API_WRITE_TOKEN` | Set | Server (admin saves / uploads) |

**Variables:** `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`

Vercel project env vars are also set (Production / Preview / Development) from local `.env.local` — never commit that file.

## Workflows

| File | Role |
| --- | --- |
| `.github/workflows/deploy-vercel.yml` | Production + PR preview deploys |
| `.github/workflows/ci.yml` | Typecheck + full `next build` |
| `.github/workflows/deploy-pages.yml` | Optional static export only (`workflow_dispatch`) |

## Admin on production

1. Open `/admin` → login (`ADMIN_USER` / `ADMIN_PASSWORD` from Vercel env)
2. Edit grid / hero → Save publishes to Sanity
3. Hero images upload to Sanity CDN (required for public stills)

No Sanity write tokens in the browser bundle.
