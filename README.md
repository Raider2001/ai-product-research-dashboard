# AI Product Research Dashboard

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

1. Export a CSV from CJ (US warehouse if the CJ UI allows it) into `data/1-cj-downloads/`.
2. Open the dashboard and click **Import CSV**. This does not touch Shopify.
3. Leave **US warehouse only** checked. Review grades.
4. Click **Download launch list** and save it into `data/2-launch-lists/`.
5. Import only that list into Shopify (or add only those SKUs in the CJ app).

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
| `data/`, `docs/` | Sample CSVs and project docs |
| `legacy/` | Earlier prototypes (JSX frontend, FastAPI backend) — not part of the submission |


The mentor proposal is in `Docs/Mentor_Proposal_Ecommerce_Product_Research_Dashboard.md`.

## BizChat

On the Tools tab. It answers from the same scoring engine (not a generic electronics chatbot). Ask it to rank the launch catalog or run a $14 / $39.99 / $5 shipping profit check.

## Related

- [Workspace README](../../../README.md)
- [Shopify README](../../../shopify/README.md)
- [Storefront pages](../../../docs/storefront-pages.md)
