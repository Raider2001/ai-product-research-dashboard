# How to Use the Product Research Dashboard

A step-by-step guide from "CJ catalog" to "30-product launch list for Shopify."

The one-line version: **CJ gives you a big CSV → the dashboard grades it → the dashboard
gives you back a small launch-list CSV → only that small file goes to Shopify.**

---

## Folders you'll use

| Folder | What goes in it |
| --- | --- |
| `data/1-cj-downloads/` | CSV files you download **from CJ** (the input) |
| `data/2-launch-lists/` | `launch-catalog.csv` files the **dashboard** generates (the output) |

---

## Step 1 — Start the app

Open two terminals:

**Terminal 1 (API):**

```powershell
cd "dashboard/ai-product-research-dashboard/api"
npm run dev
```

**Terminal 2 (frontend):**

```powershell
cd "dashboard/ai-product-research-dashboard/client"
npm run dev
```

Then open **<http://localhost:5173>** in your browser.

> ⚠️ Both servers must be running. If the page loads but nothing works, the API
> terminal probably isn't running.

## Step 2 — Log in

Sign up with your own email, or use the demo account:

- **Email:** `demo@store.test`
- **Password:** `password123`

> ⚠️ By default the database is **in-memory**: every time the API restarts, accounts
> and imported catalogs reset. That's fine for grading/demos — just re-import your CSV
> after a restart. To keep data permanently, set `MONGO_URI` in `api/.env`.

## Step 3 — Get the catalog CSV from CJ

1. In CJdropshipping, filter to **US warehouse** if the screen allows it.
2. Export as **CSV** — not the Excel workbook (the .xlsx can be hundreds of MB).
3. Save the file into `data/1-cj-downloads/`, named by date
   (example: `cj-us-2026-09-26.csv`).

## Step 4 — Import it into the dashboard

1. In the dashboard toolbar, click **Import CSV**.
2. Pick the file you just saved in `data/1-cj-downloads/`.
3. Wait for "Catalog saved to your account." Every product is scored automatically.

Nothing is sent to Shopify at this point — scoring is private to your account.

## Step 5 — Review the grades

Each product gets an overall score built from niche fit (30%), profit after Shopify
fees (30%), shipping speed (20%), competition (10%), and photo quality (10%):

| Grade | Score | Meaning |
| --- | --- | --- |
| **Add Immediately** | 90–100 | Put it in the launch list |
| **Consider** | 80–89 | Good — review margin and shipping |
| **Test Later** | 70–79 | Not for launch; maybe later |
| **Skip** | below 70 | Don't list it |

Tools on the toolbar:

- **US warehouse only** checkbox — leave it ON for launch picks.
- **Grade dropdown** — show only one grade at a time.
- **Search box** — type a product name and **press Enter** (the checkbox and dropdown
  update instantly, but search waits for Enter).
- **Research notes** panel (right side) — write down *why* a product is in or out, so
  you remember next session.

## Step 6 — Download the launch list

Click **Download launch list** (this button is in the **dashboard**, not CJ).

- The dashboard picks the best ~30 products from your scored catalog and downloads
  `launch-catalog.csv` to your browser's **Downloads** folder.
- Move that file into `data/2-launch-lists/` and add the date to the name
  (example: `launch-catalog-2026-09-26.csv`).

## Step 7 — Send ONLY the launch list to Shopify

Use the launch-list CSV to add those specific products in Shopify or the CJ app.
Never import the raw CJ catalog into Shopify — the whole point of the dashboard is
that only the ~30 screened winners go live.

---

## Quick troubleshooting

| Problem | Fix |
| --- | --- |
| Page loads but "Log in to continue" errors | The API restarted — log in again |
| My imported products disappeared | In-memory DB reset on API restart — re-import the CSV (Step 4) |
| Import fails | Make sure it's a **CSV** export from CJ, not the .xlsx workbook |
| No products in the table | Turn off "US warehouse only," or clear the grade filter |
| Search doesn't do anything | Press **Enter** after typing |

More detail: see `CHEATSHEET.md` for start/stop commands and `README.md` for setup.
