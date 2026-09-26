# Capstone Step 3 — Source Your Data & Frontend User Flow

Project: **E-Commerce Product Research Dashboard**

## Data source

The application is powered by its **own REST API** (Express + TypeScript + MongoDB).
The catalog data enters the system as a **CSV export from a dropship supplier**
(CJdropshipping or TopDawg), uploaded by the logged-in user:

1. The user exports a catalog CSV from the supplier's website (US-warehouse filtered
   when possible). Sample files live in `data/sample_products.csv`.
2. The frontend POSTs the raw CSV text to `POST /api/imports/catalog`.
3. The import service (`server/src/services/importService.js`) parses the CSV with
   `csv-parse`, normalizes ~10 different possible column-name aliases, collapses
   duplicate warehouse rows, and prefers US warehouses.
4. The shared scoring pipeline (`shared/productPipeline.js`) computes niche fit,
   profit after Shopify fees (2.9% + $0.30), shipping speed, competition, and quality
   scores, an overall 0–100 grade, and a List / Extra / Do-not-list verdict.
5. Scored products are saved to MongoDB, owned by the importing user.

No third-party API keys are required, so the app runs and deploys with zero external
credentials. A live CJ/TopDawg API integration is a stretch goal.

## Frontend application flow

```
START → /login (or /signup)
      → /dashboard  (private route — redirects to /login without a JWT)
          ├── Stats cards (catalog size, Add now, Consider, Niche fits)
          ├── Grade distribution bar chart (Recharts)
          ├── Toolbar: US-warehouse filter · grade filter · name search · Import CSV
          ├── Product table (grade pill, margin, days to ship, score)
          ├── Research notes panel (create + list)
          └── Download launch list (30-SKU CSV)
      → Log out → /login → END
```

## User flow description

- **New user:** signs up → lands on an empty dashboard → imports a supplier CSV →
  reviews grades with the US-only filter on → saves research notes on borderline
  products → downloads the launch list → imports only that list into Shopify.
- **Returning user:** logs in → reviews the previously imported catalog → adjusts
  filters → re-imports a newer CSV (replaces their catalog) → downloads an updated
  launch list.

## Pages and components

| Page | Route | Key components |
| --- | --- | --- |
| Login | `/login` | email/password form, link to signup |
| Signup | `/signup` | name/email/password form |
| Dashboard | `/dashboard` | Topbar, Toolbar, Stats cards, Grades chart, Product table, Notes panel |

State is held in React function-component state and an auth context; server data is
fetched from the REST API on filter changes.
