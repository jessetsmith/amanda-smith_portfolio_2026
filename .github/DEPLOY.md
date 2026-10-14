# Deploy (GitHub Actions → Vercel)

This app is **not** static-export / GitHub Pages friendly (`/admin`, API routes, Sanity revalidation). Production hosting is **Vercel**.

## Live URL status

A public URL appears **after** Jesse links a Vercel project and adds the GitHub secrets below, then the **Deploy Vercel** workflow succeeds on `main`.

Until then:

- **CI** (`.github/workflows/ci.yml`) still runs typecheck + `next build` on every push/PR
- **Deploy** (`.github/workflows/deploy-vercel.yml`) fails at “Require Vercel secrets” by design

## Exact GitHub secrets Jesse must add

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | How to get it |
| --- | --- |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create (scope: full account or this project) |
| `VERCEL_ORG_ID` | After `vercel link` locally: `.vercel/project.json` → `orgId` (or Vercel → Team / Account Settings → General → Team ID) |
| `VERCEL_PROJECT_ID` | Same file → `projectId` (or Project → Settings → General → Project ID) |

Do **not** commit `.vercel/` or real tokens.

### One-time local link (on Jesse’s machine)

```bash
cd portfolio_2026
npx vercel login
npx vercel link          # create or select project
# copy orgId + projectId from .vercel/project.json into GitHub secrets
```

Optional: import the GitHub repo in the Vercel dashboard (**Add New… → Project**) instead of CLI — then copy the same IDs into GitHub secrets so Actions can deploy.

## Vercel project environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production + Preview). Values come from local `.env.local` — never commit them.

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Public |
| `NEXT_PUBLIC_SANITY_DATASET` | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | e.g. `2025-01-01` |
| `SANITY_API_READ_TOKEN` | Server-only |
| `SANITY_API_WRITE_TOKEN` | Server-only; needed for `/admin` Sanity writes |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Change from local defaults for any shared deploy |
| `GOOGLE_TRANSLATE_API_KEY` | Optional |

`vercel pull` in Actions loads these into the build. Align names with `.env.example`.

## Workflows

| File | When | What |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push/PR → `main` | `npm ci` · typecheck · lint (non-blocking) · `next build` |
| `.github/workflows/deploy-vercel.yml` | push/PR → `main`, or manual | Preview (PR) / Production (`main`) via Vercel CLI |

After secrets exist: push to `main` or **Actions → Deploy Vercel → Run workflow**.
