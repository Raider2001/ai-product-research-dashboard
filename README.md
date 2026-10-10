# AI Product Research Dashboard

**Live demo:** <https://ai-product-research-dashboard.onrender.com> — demo account `demo@store.test` / `password123`. (Free-tier hosting: the first load after an idle period takes ~50 seconds while the server wakes up.)

Grade supplier catalogs (TopDawg / CJ) for a **30-SKU organization store**: 10 Home Organization, 10 Desk & Office, 10 Kitchen Organization.

This is not a “list 5,000 products” tool. It scores niche fit, profit after Shopify fees, shipping speed, competition, and photo quality, then tells you Add Immediately / Consider / Test Later / Skip.

## Scoring

| Factor | Weight | Scale |
| --- | --- | --- |
| Niche fit | 30% | 5 perfect, 3 adjacent, 1 random |
| Profit | 30% | 40% margin floor, 50%+ preferred (price − cost − shipping − Shopify fees − ads) |
| Shipping | 20% | 5 = 2–5 days … 1 = 14+ days |
| Competition | 10% | Amazon/Walmart price reality check |
| Quality | 10% | Photos + description |

Overall: **90–100 Add Immediately**, **80–89 Consider**, **70–79 Test Later**, **below 70 Skip**.

## Daily flow

**Full step-by-step guide: [docs/HOW_TO_USE.md](docs/HOW_TO_USE.md)** (includes where to save the CJ CSVs and launch lists).

1. Export from CJ (US warehouse if the CJ UI allows it) into `data/1-cj-downloads/`. CSV is best; `.xlsx` workbooks also work (converted in the browser automatically).
   - If the workbook is huge (CJ embeds every product photo — they can be hundreds of MB), convert it first: `python scripts/convert-cj-xlsx.py "path\to\file.xlsx"` writes a small CSV into `data/1-cj-downloads/`.
2. Open the dashboard and click **Import CSV / Excel**. You can select **several files at once** — they merge into one catalog and duplicates collapse (US warehouse wins). This does not touch Shopify.
3. Leave **US warehouse only** checked. Review grades.
4. Tick the **checkboxes** on products you want to sell (or filter to a grade and click **Select all \<grade\>**). Selections are saved to your account.
5. Optional: click a row's **Photos** button to attach up to 5 pictures from your PC — they display as thumbnails and improve the product's quality score.
6. Click **Export selected to Shopify** and import the downloaded `shopify-products.csv` in **Shopify Admin → Products → Import**. (Or use **Download launch list** for the auto-picked 30-SKU list, saved into `data/2-launch-lists/`.)

Notes: re-importing a catalog **replaces** it, clearing selections and uploaded photos — import first, select and attach photos last. Uploaded photos are for the dashboard only; the Shopify file can only reference pictures hosted at web URLs.

## Accessibility

The dashboard is keyboard-operable end to end: every control (including the file-upload buttons) is reachable with Tab and shows a visible focus outline. Filters and inputs have screen-reader labels, status messages are announced via a live region and color-coded (success / error / working), the grades chart has a text alternative, and the product table uses a caption and column scopes.

## Run the capstone app

The submission app is the TypeScript client and API in this folder. Sign up or use the demo account `demo@store.test` / `password123`.

```powershell
cd "dashboard/ai-product-research-dashboard/api"
npm install
npm run dev
```

```powershell
cd "dashboard/ai-product-research-dashboard/client"
npm install
npm run dev
```

Frontend: <http://localhost:5173>  
API: <http://localhost:8000/api>

Set `MONGO_URI` in `api/.env` to use a local MongoDB or Atlas database. If it is unset, the API starts an in-memory MongoDB for the session — **accounts you create and CSVs you import are wiped whenever the API restarts**, so import your catalog after starting the servers when demoing.

## Repo layout

| Folder | Purpose |
| --- | --- |
| `client/` | **Submission frontend** — React + TypeScript + Vite |
| `api/` | **Submission API** — Express + TypeScript + MongoDB (JWT auth) |
| `server/`, `shared/` | Scoring pipeline and CSV import services used by the API |
| `scripts/` | `convert-cj-xlsx.py` — turns a giant CJ workbook into a small importable CSV |
| `data/`, `docs/` | Sample CSVs and project docs |
| `legacy/` | Earlier prototypes (JSX frontend, FastAPI backend) — not part of the submission |

**Reviewing the code?** Start with [docs/CODE_WALKTHROUGH.md](docs/CODE_WALKTHROUGH.md) — it follows one product's journey through every file, in reading order.


The mentor proposal is in `Docs/Mentor_Proposal_Ecommerce_Product_Research_Dashboard.md`.

## BizChat

On the Tools tab. It answers from the same scoring engine (not a generic electronics chatbot). Ask it to rank the launch catalog or run a $14 / $39.99 / $5 shipping profit check.

## Related

- [Workspace README](../../../README.md)
- [Shopify README](../../../shopify/README.md)
- [Storefront pages](../../../docs/storefront-pages.md)
