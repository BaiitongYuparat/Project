# Virtual Try-On Open Platform — Project Guide

> Reference doc for coding agents and developers: product spec, roles, flows, data model, and feature status.
> **Status legend:** ✅ implemented · 🚧 partial · 📝 planned (requirement only, not in code yet).
> Requirements marked **[REQ]** come from the product owner. Statuses verified against the codebase on 2026-11-09.

## 1. What the product is

An **open virtual try-on (VTO) platform**:

- **Brands/shops register through the web app.** After approval, they get a shop-admin back office.
- **Shoppers** use the **web** or the **mobile app** to browse products and try them on.
- Try-on is **AI-generated in a single step with Flux**: the shopper picks **multiple garments across categories — top, bottom, dress, accessories —** and gets one composed VTO image.
- **AI features:** body-type analysis & clothing recommendation, image quality checks (both shopper body photos and brand product photos), occasion-based recommendation, and mix & match.
- **Two admin layers:** a platform **super admin** (store approval/suspension, AI prompt editing, reports, AI rate limits) and per-brand **shop admins** (dashboard, product management, sub-admin management).

## 2. Repository layout

| Path | What it is | Stack | Dev command |
| --- | --- | --- | --- |
| `backend/` | REST API | Node + Express + Prisma (PostgreSQL) + JWT/Google OAuth + AWS S3 + Gemini | `npm run dev` (in `backend/`) |
| `frontend/` | Web app — shopper + shop admin + super admin | React 19 + Vite + Ionic React + react-router v7 + Redux Toolkit + Tailwind + zod + react-hook-form | `npm run dev` (in `frontend/`) |
| `myapp/` | Mobile app — shopper | Expo / React Native + Expo Router + nativewind + Redux | `npx expo start` (in `myapp/`) — **read `myapp/AGENTS.md` first** |

API collections live in `postman/` and `.postman/`.

## 3. Actors & roles

Roles are two-dimensional (`UserRole` and `BrandMemberRole` in the Prisma schema):

- `User.role`: `SUPER_ADMIN` | `USER`
- `BrandMember.role` (scoped to one brand): `OWNER` | `ADMIN`
- `Brand.status`: `PENDING` → `APPROVED` | `REJECTED` · [REQ] add a **suspended** state for rule-breaking stores

### Capability matrix

| Capability | Shopper | Brand OWNER | Brand ADMIN | Super admin |
| --- | :-: | :-: | :-: | :-: |
| Browse products, try-on, body profile | ✅ | — | — | — |
| Brand dashboard / demand analytics | — | ✅ | ✅ | — |
| Product management (images, details, sizes) | — | ✅ | ✅ | — |
| Add `ADMIN` members to own brand | — | ✅ | ✅ [REQ] | — |
| Remove members | — | ✅ | ❌ **can never remove an `OWNER`** [REQ] | — |
| Promote a member to `OWNER` / change role to `OWNER` | — | ❌ **never — any role** [REQ] | ❌ **never** [REQ] | — (goes through the transfer request) |
| Request an ownership transfer (pick a new owner email) | — | ✅ [REQ] | ❌ | — |
| Approve / reject ownership-transfer requests | — | — | — | ✅ [REQ] |
| Approve / reject / suspend brands | — | — | — | ✅ [REQ] |
| Edit AI prompts | — | — | — | ✅ [REQ] |
| Reports + AI rate-limit management | — | — | — | ✅ [REQ] |

**Rule to enforce in the service layer** (`backend/src/services/brandAccessService.ts`), not just the UI: brand `ADMIN`s can manage members of their own brand but must never be able to delete or demote an `OWNER`.

**Ownership transfer rule [REQ]:** changing a member's role to `OWNER` is impossible from the shop-admin side (no role, not even the current `OWNER`; blocked in the UI and in `updateBrandMemberRole`). To change ownership, the current `OWNER` submits a request (`OwnerTransferRequest`) specifying the new owner's email (any email — the account is upserted on approval). A **super admin** then approves/rejects it in the admin-frontend ("Owner Transfer Requests", `backend/src/routes/adminRoutes.ts` → `/admin/owner-transfer-requests`). On approval the new email becomes `OWNER` and the requesting owner is demoted to `ADMIN` automatically in one transaction. A brand can have only one `PENDING` request at a time.

## 4. Core flows

### 4.1 Shopper onboarding (✅ mostly implemented)
1. Sign up / sign in — email + **Google OAuth**; session via JWT cookies.
2. Accept terms (`UserConsent`).
3. Fill body profile (`Body`: measurements, `Gender`).
4. Upload body photos (stored in S3) → **AI Image Quality Check** (Gemini) validates: real person, full body visible, correct angle (front / back / left / right), clear and well lit → `APPROVED` / `REJECTED` with reason.
5. **AI Body-type** analysis (`BodyType`) → body-shape classification + suitable clothing recommendations.

### 4.2 Try-on generation (📝 core next step)
1. Shopper browses products and selects **one or more garments** across categories (top / bottom / dress / accessories).
2. The selection is sent for **single-step Flux VTO generation** producing one composed image.
3. Progress tracked in `TryOnLog`: `PENDING` → `SUCCESS` | `FAILED`.

### 4.3 Brand onboarding (🚧)
1. Brand registers via the web → `Brand` created with status `PENDING`.
2. Super admin reviews and approves (`APPROVED`) or rejects (`REJECTED`); violators get **suspended** [REQ].
3. Owner invites staff (`BrandInvite` + `InviteStatus`) who become `BrandMember`s.

### 4.4 Product management — brand side (🚧)
- CRUD products: images, details, and **size charts** (`ProductSizeChart`).
- Product image upload → **AI Image Quality Check (product side)** → `ProductImageQualityStatus`: `PENDING` / `PASSED` / `FAILED`.
- Engagement analytics: `ProductClick` and `TryOnLog` feed the shop dashboard [REQ].

## 5. AI features & status

| Feature | Side | Engine | Status |
| --- | --- | --- | --- |
| Image Quality Check — body photos | Shopper | Gemini (`@google/genai`, structured JSON schema) | ✅ `geminiService.checkBodyImage` |
| Image Quality Check — product photos | Brand | Gemini | ✅ `productImageQuality` |
| AI Body-type (shape analysis + recommendations) | Shopper | Gemini (`bodyTypeService`) | ✅ |
| **VTO generation — single-step, multi-garment** | Shopper | **Flux** | 📝 build next |
| AI Recommendation (by occasion) | Shopper | TBD | 📝 planned |
| AI Mix & Match | Shopper | TBD | 📝 planned |
| Admin-editable AI prompts | Super admin | — | 📝 planned |
| AI rate limiting | Platform | — | 📝 planned |
| Reports management | Super admin | — | 📝 planned |

**Conventions for AI work:**
- Prompts must be **editable from the super-admin panel** [REQ] — keep prompts in DB/config, never hardcoded in service files.
- Follow the existing pattern in `backend/src/services/geminiService.ts`: force `responseMimeType: "application/json"` with a `responseSchema`, and give structured approve/reject results with reasons.
- Generation endpoints must create a `TryOnLog` row and update its status on success/failure.

## 6. Backend (`backend/`)

Layered structure: `routes/` → `controllers/` → `services/`; cross-cutting concerns in `middlewares/` (`auth`, `requireSuperAdmin`, `brandAccess`, `upload` → S3), helpers in `utils/`, shared clients in `lib/`.

Mounted routes (`src/index.ts`): `/auth`, `/user`, `/body`, `/images`, `/clothings`, `/userconsent`, `/body-type`, `/brands`, `/admin`, plus `/` public routes. Port: `PORT` env or **3000**. CORS allows `http://localhost:5173` with credentials (JWT cookies).

Prisma models: `User`, `Body`, `BodyType`, `Image`, `UserConsent`, `Clothing`, `Brand`, `BrandMember`, `BrandInvite`, `BrandCustomer`, `Product`, `ProductSizeChart`, `ProductImage`, `TryOnLog`, `ProductClick`, `Model`.

### Environment variables (`backend/.env` — never commit)

`DATABASE_URL`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID_APP`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `GEMINI_API_KEY`, `GEMINI_MODEL`. (Flux/try-on keys will be added with §4.2.)

## 7. Web app (`frontend/`)

Three surfaces behind `routes/ProtectedRoute` + guards:

- **Customer** (`layouts/CustomerLayout`): browse, try-on, favorites (`context/FavoritesContext`).
- **Shop admin** (`layouts/ShopAdminLayout`, `components/ShopAdminGuard`, pages `pages/AdminStore`): dashboard, products, members.
- **Super admin** (`layouts/SuperAdminLayout`, pages `pages/SuperAdmin`): stores, prompts, reports.

State: Redux Toolkit (`store/` — one slice per domain). API layer: axios clients in `services/`.

## 8. Mobile app (`myapp/`)

Expo Router tabs: `home`, `vto`, `stylist`, `myoutfit`, `profile`, plus screens for body setup/edit and settings. Service and Redux layers mirror the web app (`service/`, `store/`).

**Read `myapp/AGENTS.md` before touching this app** — it has version-specific Expo rules (check installed SDK docs, CNG, EAS, and run `npx expo lint` + `npx tsc --noEmit` before finishing any task).

## 9. Working conventions

- **TypeScript everywhere.** Keep domain naming consistent: `Brand` = shop/store, `BrandMember` = staff, `Member` roles are per-brand.
- **Verify before done:** run typecheck/lint for the app you touched (`npx tsc --noEmit` in `backend/`, `frontend/`, and `myapp/`).
- **Doc maintenance:** when a feature from §5 moves from 📝 → ✅/🚧, update this file in the same PR.
