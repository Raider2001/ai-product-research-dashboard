# Mentor Demo Script — Product Research Dashboard

A 10-minute walkthrough, in order. Practice it once and you're set.

## Before the call (5 minutes ahead)

1. Open <https://ai-product-research-dashboard.onrender.com> and wait for it to load —
   the free server sleeps when idle, and the first load takes ~50 seconds. Loading it
   before the call means the mentor never sees the wait.
2. Have `data/demo-catalog.csv` visible in a File Explorer window (you'll import it live).
3. Have these tabs ready:
   - The live app (logged out, on the login screen)
   - The GitHub repo: <https://github.com/Raider2001/ai-product-research-dashboard>
   - Pull request #1 (Pull requests tab → the dev→main PR)

## 1. The problem (30 seconds)

> "I'm building a Shopify organization store. Suppliers like CJdropshipping export
> catalogs with thousands of rows, and picking 30 good products by hand is guesswork.
> This app scores every product on niche fit, profit after Shopify fees, shipping
> speed, competition, and quality — and tells me exactly what to list."

## 2. Live demo (5 minutes) — the main event

1. **Sign up** with a fresh email (shows registration + validation), or log in with
   the demo account `demo@store.test` / `password123`.
2. Point out the empty dashboard: *"Every account gets its own private catalog —
   users can never see each other's data."*
3. Click **Import CSV** → pick `demo-catalog.csv`. Narrate while it scores:
   *"This simulates a CJ supplier export — 15 products, mixed niches and warehouses."*
4. Walk the results:
   - The **grade chart** and stat cards update instantly.
   - The niche organization products from **US warehouses** graded *Consider*.
   - The **electronics** (off-niche) and **China-warehouse** items graded *Skip* —
     *"slow shipping and bad niche fit are disqualifying, exactly like my real store rules."*
5. Toggle **US warehouse only** off and on; filter by grade; search a product name
   (press Enter).
6. Add a **research note** (*"why I'm keeping the bamboo organizer"*) — saves to MongoDB.
7. Click **Download launch list** → open the CSV: *"This is the only file that would
   ever go to Shopify — the screened winners, not the raw dump."*

## 3. Under the hood (2 minutes)

- GitHub repo tab: show the structure — `client/` (React + TypeScript), `api/`
  (Express + TypeScript), `shared/` (the scoring engine used by both),
  `docs/planning/` (Steps 1–5 documents).
- Mention the stack: *"JWT auth with bcrypt password hashing, MongoDB Atlas in the
  cloud, per-user data isolation on every query."*
- Tests: *"18 automated tests — unit tests on the scoring math and integration tests
  covering signup through launch-list download, including that one user can't read
  another user's catalog."* (If asked, run `npm test` in `api/` on screen.)

## 4. The submission (30 seconds)

- Open **Pull request #1** — *"per the Step 6 instructions, the full application is an
  open PR from dev into main, left unmerged."*
- Optional flex: open **MongoDB Compass** and show the live `products` collection
  updating after an import — the same cloud database the deployed site uses.

## Likely mentor questions — ready answers

| Question | Answer |
| --- | --- |
| How is the score computed? | Weighted: niche fit 30%, profit 30%, shipping 20%, competition 10%, quality 10%. 90+ Add Immediately, 80–89 Consider, 70–79 Test Later, below 70 Skip. |
| How do you calculate profit? | Price − supplier cost − shipping − Shopify fees (2.9% + $0.30). 40% margin floor, 50% preferred. |
| Where does the data come from? | CSV exports from CJdropshipping/TopDawg, imported through my own REST API — no external API keys needed to run it. |
| How is it secured? | bcrypt-hashed passwords, JWT bearer tokens, every MongoDB query filtered by the logged-in user's id, secrets in environment variables. |
| Where is it hosted? | Render (web service, deployed from GitHub via a render.yaml blueprint) + MongoDB Atlas. The API serves the built React app so it's one origin. |
| Why does the first load take a minute? | Free-tier hosting spins down when idle; it wakes on the first request. |
| What would v2 look like? | Push the launch list into Shopify via the Shopify API, pull live CJ pricing, email digests — listed as stretch goals in the proposal. |
