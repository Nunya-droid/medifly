# MediFly — Healthcare at Your Doorstep

> **Academic demonstration project.** All customers, pharmacies, products, orders, payments and delivery activities shown are fictional. This platform does not process real prescriptions, payments or deliveries.

MediFly is a responsive web application that connects customers with participating pharmacies and coordinates delivery of medicines and eligible healthcare products. It has four connected role experiences — **customer**, **pharmacy**, **courier** and **administrator** — sharing one simulated backend persisted in the browser.

Its distinguishing feature is the **Intelligent Delivery Engine**: a deterministic, explainable recommendation of motorcycle, vehicle or (simulated) drone delivery based on location, stock, product handling, prescription status and partner availability.

---

## Contents

1. [Technology stack](#technology-stack)
2. [Getting started](#getting-started)
3. [Demo accounts](#demo-accounts)
4. [Demonstrating the cross-role workflow](#demonstrating-the-cross-role-workflow)
5. [Application routes](#application-routes)
6. [Architecture](#architecture)
7. [Intelligent Delivery Engine](#intelligent-delivery-engine)
8. [Data simulation and persistence](#data-simulation-and-persistence)
9. [Deploying to Vercel](#deploying-to-vercel)
10. [Testing summary](#testing-summary)
11. [Safety and compliance choices](#safety-and-compliance-choices)
12. [Current limitations](#current-limitations)
13. [Replacing the simulation with Supabase](#replacing-the-simulation-with-supabase)

---

## Technology stack

| Area | Choice |
| --- | --- |
| Framework | Expo SDK 58, React Native 0.88, React Native Web, React 19 |
| Routing | Expo Router (file-based, `src/app`), single-page web output |
| Language | TypeScript (strict) |
| Styling | `StyleSheet` with a design-token system (`src/theme`) — Inter typeface |
| Icons | Lucide React Native (per-icon imports, see below) |
| Graphics & charts | React Native SVG (custom charts and illustrations) |
| Forms | React Hook Form + Zod |
| Persistence | `localStorage` (data) · `sessionStorage` (per-tab login) · IndexedDB (prescription file previews) |
| Tests | Jest (`jest-expo`) for service logic; Playwright for browser end-to-end checks |

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run web          # start the dev server and open the web app
```

| Command | Purpose |
| --- | --- |
| `npm run web` | Development server (web) |
| `npm run build:web` | Production export to `dist/` (`expo export --platform web`) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (`eslint-config-expo`, including React Compiler rules) |
| `npm test` | Jest unit and workflow tests |
| `npm run generate:icons` | Regenerate `src/components/ui/icons.ts` after using a new Lucide icon |

To preview the production build locally, serve `dist/` with any static server that falls back to `index.html` for unknown paths (for example `npx serve -s dist`).

> **Icons:** import icons from `@/components/ui/icons`, not from `lucide-react-native` directly. Metro does not tree-shake, so a root import bundles all ~1,600 icons (≈2.5 MB). If you use a new icon, add it to your import and run `npm run generate:icons`.

## Demo accounts

All demo accounts use the password **`Demo123!`**. The sign-in page also has one-click buttons for each role.

| Role | Email | Lands on |
| --- | --- | --- |
| Customer | `customer@medifly.demo` | `/customer/dashboard` |
| Pharmacy (Community Pharmacy) | `pharmacy@medifly.demo` | `/pharmacy/dashboard` |
| Courier (motorcycle) | `courier@medifly.demo` | `/courier/dashboard` |
| Administrator | `admin@medifly.demo` | `/admin/dashboard` |

Authentication is a **demonstration implementation, not production-grade security**: passwords are stored as a non-cryptographic digest in browser storage. New customers can register at `/register`.

## Demonstrating the cross-role workflow

Login sessions are stored **per browser tab**, while data is shared by all tabs in the same browser. The smoothest live demo is one tab per role, side by side — changes appear in the other tabs immediately.

1. **Customer** — search “ORS”, add to cart, open the cart and **Proceed to checkout**. Step through address → pharmacy stock confirmation → delivery recommendation → simulated payment → review, then **Place order**.
2. **Pharmacy** — open **Orders**, select the new order, then **Confirm stock** → **Mark preparing** → **Mark ready for collection**. (Optionally offer it to a courier from **Dispatch**.)
3. **Courier** — open **Jobs**, **Accept** the job, then **Confirm arrival at pharmacy** → **Confirm collection** → **Start delivery** → **Mark delivered** (with a confirmation step).
4. **Customer** — the order page shows *Delivered* with the full timeline.
5. **Administrator** — the overview, live orders, delivery monitoring, analytics and audit logs all reflect the change.

To demonstrate a prescription order, add **Amoxicillin**, **Metformin** or another item marked *Prescription required*; checkout asks for a prescription upload, and the pharmacy cannot confirm stock until a pharmacist approves it in **Prescriptions**.

To demonstrate the drone simulation, deliver to the *Mum's house* (East Legon) address from **East Legon Pharmacy** with a small over-the-counter item. Switch **Admin → Settings → Simulated drone operating conditions** to *Unfavourable* to see the engine fall back to ground delivery.

## Application routes

**Public:** `/` (landing page) · `/login` · `/register`

**Customer** (`/customer/…`): `dashboard` · `search` · `product/[id]` · `cart` · `checkout` · `prescription` · `orders` · `orders/[id]` (tracking) · `addresses` · `profile` · `notifications` · `support`

**Pharmacy** (`/pharmacy/…`): `dashboard` · `orders` · `prescriptions` · `inventory` · `dispatch` · `history` · `reports` · `profile` (opening hours and settings) · `notifications`

**Courier** (`/courier/…`): `dashboard` · `jobs` · `deliveries/[id]` · `history` · `profile` · `notifications`

**Administrator** (`/admin/…`): `dashboard` · `orders` · `deliveries` · `partners` · `support` · `payments` · `service-areas` · `analytics` · `audit-logs` · `settings` · `notifications`

Each portal's layout enforces role-based access: signed-out users are sent to `/login` (and returned afterwards), and users of another role are sent to their own dashboard. Pharmacy staff see only their assigned pharmacy; administrators can also open the pharmacy portal and switch between pharmacies.

## Architecture

```
src/
├── app/                 Expo Router routes (one file per screen; _layout.tsx per portal)
├── components/
│   ├── ui/              Design-system components (Button, Input, Select, Modal, Drawer,
│   │                    DataTable, Tabs, Charts, Timeline, FileUpload, StatCard, …)
│   ├── layout/          AppShell (sidebar / top-nav / bottom tabs), RoleGate, notifications
│   ├── shared/          Cross-role pieces (order timeline, product card, address form, …)
│   ├── pharmacy/ courier/ admin/
│   └── illustrations/   SVG logo, hero art, product placeholders, simulated route map
├── services/            Simulated backend (see below)
├── data/                Fictional seed data
├── hooks/               useDb, useCurrentUser, useAction, useResource, useBreakpoint, …
├── contexts/            Toast, confirmation dialogs, pharmacy scope
├── constants/           Status metadata, allowed order transitions, catalogue labels
├── types/               Domain types
├── theme/               Design tokens (colour, type scale, spacing, radii, shadows)
└── utils/               Formatting (GH₵, dates), geo distance, ids
```

**Data flow.** UI components never modify seed data. They read a reactive snapshot via `useDb()` (React `useSyncExternalStore` over the store) and change data only by calling **asynchronous service functions** — `orderService.createOrder()`, `deliveryService.acceptJob()`, `prescriptionService.reviewPrescription()` and so on. Each service validates permissions and inputs, applies the change in a single commit, writes the affected collections to storage, and notifies subscribers, so every open screen (and every tab) updates immediately.

**Order lifecycle.** `src/constants/status.ts` defines the allowed transitions, and `src/services/orderLifecycle.ts` is the single place where an order changes status. It enforces the transition table and the prescription rule, and applies every side effect together: delivery record, stock reservation/return, payment state, notifications and audit log.

Statuses: Order placed → Awaiting pharmacy → Pharmacy confirmed → Preparing → Ready for collection → Courier assigned → Collected → En route → Delivered, plus Rejected, Cancelled and Delivery failed.

**Services** (`src/services`): `authService`, `productService`, `pharmacyService`, `cartService`, `orderService`, `orderLifecycle`, `prescriptionService`, `deliveryService`, `deliveryRecommendationService`, `paymentService`, `notificationService`, `supportService`, `adminService`, `analyticsService`, `auditService`, `userService`, plus `storageService`, `db` and `fileStore` for persistence.

**Responsive design.** Breakpoints are 768 px and 1024 px. Operations portals use a persistent sidebar on desktop, an icon-only collapsible sidebar on tablet, and a drawer on mobile. The customer and courier apps use a top navigation bar on desktop and bottom tabs on mobile. Tables become cards on mobile, and detail panels become slide-over drawers.

## Intelligent Delivery Engine

`src/services/deliveryRecommendationService.ts` evaluates every method against explicit rules and returns structured output: the recommended method, eligible alternatives, excluded methods **with reasons**, fee, ETA, distance and a list of the checks performed.

- **Location:** the destination must be an active service area that supports the method.
- **Pharmacy and stock:** the pharmacy must be verified, accepting orders and list stock for every item.
- **Product suitability:** cold-chain items exclude motorcycles; orders over 8 kg exclude motorcycles; prescription-only and unsuitable items exclude drones; the drone payload limit is 2 kg.
- **Partner availability:** a verified, online partner with that vehicle type must serve the area. Busy partners add a waiting time.
- **Drone (simulation only):** offered only if the area and pharmacy are flagged as being on a simulated route, an authorised demo operator is available, every item is suitable and the simulated conditions are favourable.
- **Fee:** area base fee + method base + (distance − 3 km) × per-km rate. The rates are editable in Admin → Settings.
- **ETA:** preparation time + pickup time + travel time (distance ÷ average speed) + any waiting time.
- **Ranking:** the lowest combined time-and-cost score wins. Motorcycles are favoured as the operational default, and vehicles are favoured for cold-chain or fragile items.

Example (Madina customer, Community Pharmacy): *Recommended: Motorcycle courier · GH₵12 · reason: a suitable motorcycle courier is available within the Madina service area. Drone delivery is not available for this simulated order: Drone (simulated) is not offered in Madina.*

## Data simulation and persistence

- **Seeding:** on first launch, `src/data/seed.ts` builds a fictional Ghana dataset relative to the current date, so "today" metrics are meaningful. It contains 7 service areas in and around Accra (Tema inactive), 6 pharmacies (one pending verification), 23 products, 6 customers, 6 delivery partners (including a simulated drone operator and one pending courier), 27 orders covering every status, 6 prescriptions in different review states, payments, support tickets, notifications and audit logs.
- **Storage:** each collection is stored under its own `localStorage` key (`medifly:v1:<collection>`). Normal startup never overwrites existing data. A missing or malformed collection is repaired individually from the seed, and a schema version change triggers a full reseed.
- **Sessions:** stored in `sessionStorage`, so each tab can be signed in as a different role.
- **Uploaded prescription previews:** stored as blobs in IndexedDB (`medifly-demo-files`). Seeded records show a generated "sample document · fictional" preview instead.
- **Simulated latency:** services wait about 350 ms (configurable in Admin → Settings) so loading states are visible.
- **Reset demo data:** available from the account menu (any role), every profile page and Admin → Settings. It restores the original dataset and clears stored file previews.
- **Scope:** data is local to one browser. Tabs in the same browser stay in sync, but nothing is synchronised across browsers or devices.

## Deploying to Vercel

The repository includes `vercel.json`:

- Build command: `npx expo export --platform web`
- Output directory: `dist`
- Rewrite of all paths to `/index.html`, so nested routes such as `/pharmacy/inventory` work after a browser refresh
- Long-lived cache headers for hashed bundles and assets

**Option A — dashboard:** push the repository to GitHub, then choose *Import Project* in Vercel. The settings are read from `vercel.json` (Framework preset: *Other*).

**Option B — CLI:**

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

No environment variables, backend, database or external API are needed. The app is a static single-page application, and every feature runs in the browser.

## Testing summary

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passes with no errors |
| `npm run lint` | Passes with no errors or warnings, including the React Compiler rules |
| `npm test` | 18 Jest tests pass |
| `npm run build:web` | Export succeeds: 54 route bundles, 1 MB shared chunk |
| `npx expo-doctor` | 20/20 checks pass |

**Jest** (`src/__tests__`) covers:

- Login for all four roles, rejection of invalid credentials, and role permissions enforced inside the services
- Seed coverage of every order status, and repair of malformed storage
- **The complete 12-step cross-role workflow** through the services: customer order → pharmacy confirm, prepare and ready → courier accept, arrive, collect, en route and deliver → customer sees Delivered → admin metrics and audit log update
- Rejection of invalid status jumps, the prescription approval guard, and prescription rejection (which rejects the order, returns stock and queues a refund)
- A declined simulated payment creating no order, failed delivery requiring a reason, and admin re-dispatch
- Delivery engine rules: the Madina motorcycle recommendation and its explanation, drone eligibility, the drone exclusions (prescription, weight, conditions), cold-chain items going by vehicle, fallback when no couriers are available, and inactive areas

**Browser end-to-end check** (Playwright with Microsoft Edge, run against the production build behind an SPA-fallback server) — all steps pass with no console errors:

- The landing page renders
- Route protection works, including a courier being blocked from `/admin`
- An invalid login shows an error
- The full customer → pharmacy → courier → customer → admin workflow completes through the UI
- Status persists after a page refresh
- 13 nested routes load directly
- There is no horizontal overflow at 375 px on the landing page and 11 customer, courier, pharmacy and admin screens
- Reset demo data restores the seed

The landing page, all four portals and the checkout flow were also checked visually at 375 px and 1440 px.

## Safety and compliance choices

- MediFly does not diagnose, prescribe or give dosage advice. Product copy says so, and the support page points users to healthcare professionals.
- Prescription-only items cannot reach *Pharmacy confirmed* or any later status, including collection or dispatch, until the linked prescription is approved. This is enforced in the service layer, not only in the UI.
- Approval is labelled as a simulated workflow state, not a clinical assessment. Partner verification is labelled as demo verification, not regulatory approval.
- Payments are simulated. No card numbers, Mobile Money PINs or other credentials are requested or stored, and a "rehearse a declined payment" option is available.
- Tracking is labelled *Simulated tracking · not live GPS*. The marker position is estimated from status updates.
- Drone delivery appears only as a labelled simulation in eligible scenarios, with no claim of real aviation approval.
- The demo disclaimer is shown on the landing page, the sign-in page, a banner in every portal, and the profile and settings pages.

## Current limitations

- There is no real backend. Data lives in one browser's storage and is not shared across devices or users on different machines.
- Authentication is simulated and not secure. Do not reuse real passwords.
- Payments, SMS, maps, GPS and drone operations are simulations. No third-party integrations are called.
- Uploaded files stay in IndexedDB on the uploading browser only, so other browsers show the sample preview.
- Time-based behaviour, such as "today" metrics and route progress, is computed from timestamps when screens render. There are no background jobs.
- The UI is web-first. It runs through React Native, but native iOS and Android builds have not been tested.

## Replacing the simulation with Supabase

The UI only calls service functions, so a real backend can be adopted one service at a time without rewriting screens:

1. **Schema:** create tables that mirror `src/types` — `users` (via Supabase Auth plus a `profiles` table), `pharmacies`, `service_areas`, `products`, `inventory`, `orders` (JSONB `items` and `timeline`, or child tables), `deliveries`, `couriers`, `prescriptions`, `payments`, `notifications`, `support_tickets` and `audit_logs`.
2. **Auth:** replace `authService.login`, `register` and `logout` with `supabase.auth`, and store the role on the profile. Keep the `RoleGate` route guards as they are.
3. **Row-level security:** encode the rules that currently live in the services as policies — customers read their own orders, pharmacy staff read their pharmacy's orders, couriers read their assigned or open jobs, and admins read everything.
4. **Services:** replace each function body's `request(() => { …getDb()… commit() })` with Supabase queries. Move the order lifecycle (`orderLifecycle.transitionOrder`) into a Postgres function or Edge Function, so transitions and side effects stay atomic and server-enforced.
5. **Reactivity:** replace `subscribe`/`useDb` with Supabase Realtime subscriptions, or a query cache such as TanStack Query that refetches on realtime events.
6. **Files:** replace `fileStore` with Supabase Storage in a private bucket with signed URLs, and add proper consent and retention controls before handling real prescriptions.
7. **Payments:** replace `paymentService.authorizeDemoPayment` with a licensed provider integration (Mobile Money and cards) using server-side webhooks.

The delivery engine (`evaluateMethods`) is a pure function of the data it reads, so it can run unchanged on the client or move server-side.
