# Deploy (GitHub Actions → Vercel)

Production is **Vercel** (full Next.js) so **`/admin`**, `/api/*`, `/studio`, and Sanity writes work.

GitHub Pages static export **cannot** host admin (no Route Handlers). The Pages workflow is optional / non-production only.

## Live URLs

| URL | Notes |
| --- | --- |
| https://portfolio.bittersweetwoman.com/ | Custom domain (DNS → Vercel) |
| https://portfolio.bittersweetwoman.com/admin | Admin |
| https://portfolio.bittersweetwoman.com/studio | Embedded Sanity Studio |
| https://amanda-smith-portfolio-2026.vercel.app/ | Vercel alias |
| https://amanda-smith-portfolio-2026.vercel.app/studio | Studio on alias |

## DNS

`portfolio.bittersweetwoman.com` should CNAME to Vercel:

| Type | Host / name | Value |
| --- | --- | --- |
| **CNAME** | `portfolio` | `6ef570c297b0004c.vercel-dns-017.com.` |

Fallback: `cname.vercel-dns.com.`

Verify: `dig +short portfolio.bittersweetwoman.com CNAME`

## Sanity Studio (self-hosted on Vercel)

Studio is embedded at `/studio` (`next-sanity` + `sanity@6.19.x`).

### Register + deploy schema (CLI → Content Lake)

```bash
npm run sanity:studio-register
# → sanity deploy --external --url https://portfolio.bittersweetwoman.com/studio --schema-required --yes
```

Schema-only refresh:

```bash
npm run sanity:schema-validate
npm run sanity:schema-deploy
```

### Serve Create/Manage static files (required for Schema column)

Manage fetches schema JSON from the live studio host. Those files must be real JSON at:

`https://portfolio.bittersweetwoman.com/studio/static/create-manifest.json`

(and the hashed `*.create-schema.json` / `*.create-tools.json` files it references).

- Extract: `npm run sanity:manifest-extract` → `public/studio/static/`
- `prebuild` runs extract automatically before `next build`
- Route handler `src/app/studio/static/[...path]/route.ts` serves them so the Studio catch-all cannot return HTML instead

After a Vercel deploy, verify:

```bash
curl -sI https://portfolio.bittersweetwoman.com/studio/static/create-manifest.json | head
# expect: content-type: application/json
```

CORS origins (credentials enabled) must include:

- `https://portfolio.bittersweetwoman.com`
- `https://amanda-smith-portfolio-2026.vercel.app`
- `http://localhost:3456` (local)

`sanity.cli.ts` stores `deployment.appId` for the production registration.

**Manage UI note:** Schema auto-detect for self-hosted can lag; after JSON is live, use **Refresh table**. If the column still shows `--` with “Unable to detect…”, the CLI path above is the documented manual verification — Dashboard/Media Library use the *registered* schema from `deploy --external`, not only the HTTP files.

### CI: `SANITY_AUTH_TOKEN`

Repo → **Settings → Secrets and variables → Actions** → add:

| Secret | Notes |
| --- | --- |
| `SANITY_AUTH_TOKEN` | Sanity Manage → API → Tokens → create a **deploy** token (`deployStudio` grant) |

Workflow `.github/workflows/sanity-schema-deploy.yml` runs `sanity:studio-register` on pushes to `main` that touch Sanity config/schema (and on `workflow_dispatch`).

## GitHub Actions secrets

| Secret | Required | Notes |
| --- | --- | --- |
| `VERCEL_TOKEN` | **Yes — Jesse must add** if Actions deploy should work | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Set | Team id from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Set | Project id from `.vercel/project.json` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Set | Public |
| `SANITY_API_READ_TOKEN` | Set | Server |
| `SANITY_API_WRITE_TOKEN` | Set | Server (admin saves / uploads) |
| `SANITY_AUTH_TOKEN` | For schema/studio register CI | Deploy token (not the read/write API tokens) |

**Variables:** `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`

Vercel project env vars are also set (Production / Preview / Development) from local `.env.local` — never commit that file.

### Vercel env (expected)

| Name | Role |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Public project id |
| `NEXT_PUBLIC_SANITY_DATASET` | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | e.g. `2025-01-01` |
| `SANITY_API_READ_TOKEN` | Server reads |
| `SANITY_API_WRITE_TOKEN` | Admin Save / uploads |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `/admin` login |

## Workflows

| File | Role |
| --- | --- |
| `.github/workflows/deploy-vercel.yml` | Production + PR preview deploys |
| `.github/workflows/ci.yml` | Typecheck + full `next build` |
| `.github/workflows/sanity-schema-deploy.yml` | Register studio + deploy schema/manifest |
| `.github/workflows/deploy-pages.yml` | Optional static export only (`workflow_dispatch`) |

## Admin on production

1. Open `/admin` → login (`ADMIN_USER` / `ADMIN_PASSWORD` from Vercel env)
2. Edit grid / hero → Save publishes to Sanity
3. Hero images upload to Sanity CDN (required for public stills)

No Sanity write tokens in the browser bundle.
