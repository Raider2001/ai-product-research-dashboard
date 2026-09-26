# Product Research Dashboard - Quick Start Cheat Sheet

## 🚀 Quick Start (Every Time)

### Step 1: Open Terminal 1 - API Server

```powershell
cd "dashboard/ai-product-research-dashboard/api"
npm run dev
```

✅ API runs on: **<http://localhost:8000>** (health check: <http://localhost:8000/health>)

### Step 2: Open Terminal 2 - Frontend Server

```powershell
cd "dashboard/ai-product-research-dashboard/client"
npm run dev
```

✅ Frontend runs on: **<http://localhost:5173>** (or 5174 if port in use)

### Step 3: Open Browser and Log In

```bash
http://localhost:5173/
```

Sign up, or use the demo account: **demo@store.test / password123**

🎉 Dashboard should load!

---

## 📋 What You'll See

- **Login / Signup**: JWT auth; each account has its own catalog and notes
- **Stats Cards**: Catalog size, Add now, Consider, Niche fits
- **Grades chart + product table**: Filter by US warehouse, grade, and name search (press Enter)
- **Import CSV**: Upload a CJ/TopDawg export to score it
- **Download launch list**: 30-SKU launch catalog CSV
- **Research notes**: Save why a product is in or out

---

## 🔧 Useful Commands

|Command|What it does|
|---|---|
|`Ctrl+C` in terminal|Stop the server in that terminal|
|`npm run dev` (in `client/`)|Start the frontend dev server|
|`npm run dev` (in `api/`)|Start the API server|
|`npm install`|Install dependencies (first run or after updates)|
|`npm run typecheck` (in `api/`)|Type-check the API|
|`npm run build` (in `client/`)|Type-check and build the frontend|

---

## ⚠️ If Something Goes Wrong

**API won't start?**

- Make sure you're in the `/api` folder
- Check if port 8000 is already in use: `netstat -ano | findstr :8000`
- Install dependencies: `npm install`

**Frontend won't start?**

- Make sure you're in the `/client` folder
- Delete `node_modules` and run `npm install` again
- Check if port 5173 is in use

**Dashboard loads but no data?**

- Make sure BOTH servers are running
- Log in first — every API route requires a token
- The default database is **in-memory**: accounts and imported CSVs reset when the API
  restarts. Re-import your CSV, or set `MONGO_URI` in `api/.env` to keep data.

**Login fails after restarting the API?**

- With the in-memory database your signup account is gone after a restart — use the
  demo account or sign up again.

---

## 📁 Project Structure

```text
ai-product-research-dashboard/
├── api/                        # Express + TypeScript + MongoDB (submission API)
│   └── src/
│       ├── index.ts           # Routes
│       ├── auth.ts            # JWT auth
│       ├── catalog.ts         # Catalog scoring/import glue
│       └── models.ts          # Mongoose models
├── client/                     # React + TypeScript + Vite (submission frontend)
│   └── src/pages/             # Login, Signup, Dashboard
├── server/, shared/            # Scoring pipeline + CSV import services used by the API
├── data/                       # Sample CSV files
└── legacy/                     # Old prototypes (JSX frontend, FastAPI backend) — not submitted
```

---

## 💾 Stopping Servers

1. In **Terminal 1** (API): Press `Ctrl+C`
2. In **Terminal 2** (Frontend): Press `Ctrl+C`

---

**Last Updated**: September 26, 2026
**Created for**: Dave's Capstone Project
