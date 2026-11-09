# Virtual Try-On Open Platform — monorepo

Open-platform virtual try-on (VTO) product: brands register via the web app, shoppers browse and try on **multiple garments at once (top, bottom, dress, accessories)** in a **single-step AI generation (Flux)**, with AI body-type analysis, image quality checks, recommendations, and mix & match. Two admin layers: a platform **super admin** and per-brand **shop admins** (OWNER/ADMIN).

**Read [PROJECT.md](./PROJECT.md) before working on feature code** — it has the full product spec, roles and permission rules (e.g. brand ADMIN can never remove an OWNER), data model, AI feature status, flows, and env vars.

## Layout

| Path | App | Notes |
| --- | --- | --- |
| `backend/` | Express + Prisma (PostgreSQL) REST API | Gemini AI, AWS S3, JWT + Google OAuth |
| `frontend/` | Web app (React 19 + Vite + Ionic) | shopper, shop admin, super admin surfaces |
| `myapp/` | Expo / React Native app | see `myapp/AGENTS.md` for Expo rules |

## Per-area rules

- **Mobile (`myapp/`):** follow `myapp/AGENTS.md` — check versioned Expo docs, never edit `ios/`/`android/` by hand, run lint + typecheck before done.
- **AI features:** prompts belong in super-admin-editable config/DB (not hardcoded); use structured JSON response schemas like `backend/src/services/geminiService.ts`.

## Docs

- Full project guide — [PROJECT.md](./PROJECT.md)
- Expo — https://docs.expo.dev/llms.txt
