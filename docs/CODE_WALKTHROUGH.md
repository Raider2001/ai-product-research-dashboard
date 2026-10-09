# Code Walkthrough — Mentor Review Guide

A reading guide to the AI Product Research Dashboard. It follows one product's
journey from a CJdropshipping export file all the way to a Shopify-ready CSV,
pointing at the exact file that does each step. Print it or keep it on a second
monitor while walking through the code.

---

## 1. The 30-second pitch

> "This app solves a real dropshipping problem: CJ gives you a catalog of
> thousands of products, and I need the best 30 for an organization-niche
> Shopify store. The app imports supplier exports, scores every product on
> five business factors — niche fit, profit after Shopify fees, shipping
> speed, competition, and photo quality — grades them Add Immediately /
> Consider / Test Later / Skip, lets me select winners with checkboxes, and
> exports my picks as a CSV in Shopify's product-import format."

**Stack:** React + TypeScript + Vite frontend · Express + TypeScript API ·
MongoDB (Mongoose) · JWT authentication · shared plain-JavaScript scoring
engine · Vitest + Supertest tests.

---

## 2. Architecture in one picture

```
Browser (client/)                    API (api/)                    MongoDB
┌──────────────────────┐   JSON    ┌─────────────────────┐   ┌─────────────┐
│ DashboardPage.tsx    │ ────────> │ app.ts   (routes)   │──>│ users       │
│ importFiles.ts  xlsx │  + JWT    │ auth.ts  (JWT)      │   │ products    │
│ imageTools.ts  photos│ <──────── │ catalog.ts (data)   │   │ suppliers   │
│ api.ts     (fetch)   │           │ models.ts (schemas) │   │ notes       │
└──────────────────────┘           └──────────┬──────────┘   └─────────────┘
                                              │ imports
                                   ┌──────────▼──────────────┐
                                   │ server/src/services/    │  CSV parsing +
                                   │   importService.js      │  deduplication
                                   │ shared/                 │
                                   │   productPipeline.js    │  ALL the scoring
                                   └─────────────────────────┘
```

Key design point to say out loud: **all business logic lives in
`shared/productPipeline.js`**, plain JavaScript with no framework or database
code. The API wraps it; the tests exercise it directly. That separation is
why the scoring rules are unit-testable in milliseconds.

---

## 3. Reading order (follow one product through the system)

### Stop 1 — `shared/productPipeline.js` (the heart, ~1,100 lines)

What to say: *"This is the scoring engine. Everything else is plumbing to get
data in and out of it."*

Read these in order:

| Function | What it does |
| --- | --- |
| `mapWorkspaceExport` (bottom of file) | Turns one normalized CSV row into a product object — estimates retail price, shipping cost, and competitor price from category and weight |
| `enrichCatalogScoring` | The main entry point. Calls every scorer below, then computes the weighted overall score and grade |
| `scoreNicheFit` | Keyword-matches the product name against three niche collections (Home / Desk / Kitchen organization). 5 = perfect, 3 = adjacent, 1 = off-niche |
| `calculateUnitEconomics` | Profit math: price − cost − shipping − Shopify fees (2.9% + $0.30) − ads → margin % |
| `resolveShippingProfile` / `hasUsWarehouse` | Reads warehouse text ("US", "CN_US", "Yiwu"...) and estimates delivery days |
| `scoreProductQuality` | Counts photos (hosted URLs + uploaded ones) — 0 photos is a red flag, 3+ with a description scores 5 |
| `gradeFromOverallScore` | 90+ Add Immediately, 80+ Consider, 70+ Test Later, else Skip |
| `buildListingDecision` | Plain-English verdict ("Do not list... margin is 32% after fees") shown under each product name |
| `toShopifyCsvRows` / `buildShopifyExportRows` | Builds rows in Shopify's product-import CSV format: unique handle, price, weight converted lbs→grams, one extra row per additional image |

The weights (fit 30%, profit 30%, shipping 20%, competition 10%, quality 10%)
are constants at the top of the file — point at `SCORE_WEIGHTS`.

### Stop 2 — `server/src/services/importService.js` (parsing + dedupe, ~300 lines)

What to say: *"CJ exports one row per size/color variant, and the same product
appears once per warehouse. My real 3,371-row export collapses to 62 actual
products — this file does that."*

- `parseRecords` — csv-parse with forgiving options (BOM, ragged rows).
- `collapseWarehouseRows` — groups rows by SPU / product URL / name, then
  `pickPreferredWarehouseRow` keeps the best warehouse (US beats CN_US beats
  EU beats CN) and remembers all options seen.
- `toWorkspaceRecord` — maps CJ's column names ("Products Name", "SKU Unit
  Price After Discount ($)") onto the canonical names the pipeline expects.
- `importCsvCatalogs(csvTexts[])` — **multi-file import**: concatenates every
  file's rows *before* deduplicating, so the same product in two files
  collapses exactly like duplicates within one file.

### Stop 3 — `api/src/` (the Express API, 5 small files)

| File | What to say |
| --- | --- |
| `models.ts` | Four Mongoose schemas. The trick: `Product` stores searchable scalars (grade, overallScore, selected — all indexed) **plus** the full scored object in a `payload: Mixed` field. Fast queries without a 60-column schema. |
| `auth.ts` | JWT: `signToken` on login/register, `requireUser` middleware reads the `Authorization: Bearer` header on every protected route. Passwords are bcrypt-hashed — never stored in plain text. |
| `catalog.ts` | The data layer. `replaceCatalog` (import), `setSelection` (checkbox persistence — one `updateMany`), `shopifyExport` (selected products → Shopify rows), `addProductImages` (validates uploads, re-runs `enrichCatalogScoring` so the quality score updates, then syncs the indexed grade/score fields). |
| `app.ts` | Every route. Note the pattern: validate input → return a friendly 400 with a human sentence → call `catalog.ts` → JSON out. Every data route filters by `req.user.id`, so **users can only ever see their own catalog**. |
| `db.ts` / `index.ts` | Connects to Atlas via `MONGO_URI`, or spins up an in-memory MongoDB when unset (that's what the tests use). |

### Stop 4 — `client/src/` (React frontend)

| File | What to say |
| --- | --- |
| `api.ts` | One tiny fetch wrapper: attaches the JWT from localStorage, parses JSON, turns API errors into thrown Errors. |
| `AuthContext.tsx` | React context holding the logged-in user + token. |
| `importFiles.ts` | File-upload prep: `.csv` is read as text; `.xlsx` is converted **in the browser** with SheetJS (`XLSX.read` → `sheet_to_csv`), CJ's banner row above the headers is stripped, and size guards fail fast with friendly messages before anything is uploaded. |
| `imageTools.ts` | Photo prep: draws each image onto a `<canvas>` scaled to max 800px and exports JPEG data-URLs under ~300KB, so phone photos don't bloat the database. |
| `pages/DashboardPage.tsx` | The whole dashboard: filters, grades chart, product table with selection checkboxes and per-row Photos buttons, import/export handlers. State is plain `useState` + one `load()` that refetches everything. |

Accessibility specifics worth pointing at in `DashboardPage.tsx` + `styles.css`:
the file inputs use a visually-hidden-but-focusable pattern (not `display:none`,
which removes keyboard access), `:focus-visible` outlines on everything, a
`role="status"` live region announces import/export results to screen readers,
and the chart has `role="img"` with a text summary since SVG charts are
invisible to screen readers.

### Stop 5 — `api/test/` (38 tests)

- `pipeline.test.ts` — pure unit tests on the scoring engine and Shopify row
  builder (fee math, grade bands, lbs→grams, handle dedupe, data-URL exclusion).
- `api.test.ts` — integration tests with Supertest against an in-memory
  MongoDB: auth, import + cross-file dedupe, selection persistence, Shopify
  export, photo uploads, and **data isolation** (user B cannot see or modify
  user A's products).

Run them live for the mentor: `cd api && npm test` (~4 seconds, no setup).

---

## 4. The data journey (your demo script, in order)

1. **Import** — Pick file(s) in the browser. `importFiles.ts` converts any
   `.xlsx` to CSV text locally, then POSTs `{ csvTexts: [...] }` to
   `/api/imports/catalog`.
2. **Parse + dedupe** — `importCsvCatalogs` merges all files' rows, collapses
   variants and warehouse duplicates (US wins).
3. **Score** — each product runs through `enrichCatalogScoring`: five factor
   scores → weighted overall score → grade → plain-English listing verdict.
4. **Store** — `replaceCatalog` writes each product to MongoDB under my user
   id: indexed scalars for filtering + the full payload.
5. **Display** — the dashboard fetches `/api/products` with my filters, plus
   `/api/analytics` for the stat cards and grades chart.
6. **Select** — checkboxes POST `/api/products/selection`; the flag persists
   in the database across sessions.
7. **Photos** — the Photos button resizes images in-browser and POSTs them;
   the server re-scores the product, so quality (and sometimes the grade)
   visibly improves.
8. **Export** — "Export selected to Shopify" fetches `/api/exports/shopify`
   and downloads `shopify-products.csv` in Shopify's import format.

---

## 5. Questions your mentor is likely to ask

**"Why is the scoring in a separate shared folder instead of the API?"**
Separation of concerns: the pipeline is pure functions with no HTTP or
database code, so it's testable in isolation and was reused unchanged when the
backend moved from the earlier prototype to the TypeScript API.

**"Why MongoDB, and why that Mixed payload field?"**
Supplier CSVs vary wildly in columns, so a rigid SQL schema would fight the
data. I index only what I filter and sort on (userId, grade, overallScore,
selected) and keep the full scored object as a document — which is the shape
the frontend needs anyway.

**"How does authentication work?"**
Register/login hashes the password with bcrypt and returns a signed JWT. The
client stores it in localStorage and sends it as a Bearer header. The
`requireUser` middleware verifies it and sets `req.user`; every query filters
on that user id. There's a test proving one user can't read or modify
another's data.

**"Why convert Excel in the browser instead of on the server?"**
The server then only ever deals with one format (CSV text in JSON), there's no
file-upload/multipart handling, and the user gets instant feedback on bad
files. For CJ's giant workbooks (hundreds of MB of embedded photos around ~6MB
of actual data), there's a Python script (`scripts/convert-cj-xlsx.py`) that
streams out just the product rows — browsers can't parse files that big.

**"What happens when a photo is uploaded?"**
Resized to ≤800px JPEG in the browser (canvas), validated server-side
(must be a `data:image/` URL, ≤~300KB, max 5 per product), appended to the
product, and then the product is **re-scored** — photos feed the quality
factor, so the grade can genuinely improve. The server also re-syncs the
indexed grade/score columns so filters stay correct.

**"What are the known limitations?"**
Re-importing replaces the catalog (clears selections/photos); uploaded photos
can't go in the Shopify CSV because Shopify only fetches images from public
URLs; competitor prices are estimates until you check Amazon/Walmart manually
(the app links the searches); and without `MONGO_URI` the API uses an
in-memory database that resets on restart.

---

## 6. Suggested 10-minute review agenda

1. (2 min) Pitch + architecture picture (sections 1–2 of this doc).
2. (3 min) Live demo following section 4: import the converted CJ CSV from
   `data/1-cj-downloads/`, filter, select, upload a photo, export.
3. (3 min) Code tour: `SCORE_WEIGHTS` + `enrichCatalogScoring` in the
   pipeline → one route in `app.ts` → `DashboardPage.tsx` import handler.
4. (2 min) `cd api && npm test` — 38 green tests, point out the data-isolation
   and cross-file dedupe cases.
