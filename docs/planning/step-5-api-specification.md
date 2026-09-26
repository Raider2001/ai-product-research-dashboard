# Capstone Step 5 — API Specification

Project: **E-Commerce Product Research Dashboard**
Style: **REST** (Express + TypeScript). All routes implemented in `api/src/index.ts`.

Base URL (dev): `http://localhost:8000` — the Vite dev server proxies `/api` and `/health`.

Auth: JWT bearer token. `POST /api/auth/register` and `POST /api/auth/login` return
`{ token, user }`; every route marked 🔒 requires `Authorization: Bearer <token>` and
operates only on the logged-in user's data.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness check: `{ status, backend, database }` |
| POST | `/api/auth/register` | – | Create account. Body `{ name, email, password (≥8) }` → `201 { token, user }`. `409` if email exists. |
| POST | `/api/auth/login` | – | Body `{ email, password }` → `{ token, user }`. `401` on bad credentials. |
| GET | `/api/auth/me` | 🔒 | Current user `{ user: { id, name, email } }`. |
| GET | `/api/products` | 🔒 | List scored products. Query params: `grade` (`all`\|grade name), `usOnly` (`true`\|`false`), `q` (name search). Sorted by delivery days. → `{ products, total }`. |
| DELETE | `/api/products` | 🔒 | Clear the user's catalog and suppliers. → `{ cleared: true }`. |
| POST | `/api/imports/catalog` | 🔒 | Body `{ csvText }`. Parses + scores a supplier CSV, replaces the user's catalog. → import summary + `products`. `400` on empty/unreadable CSV. |
| GET | `/api/suppliers` | 🔒 | List the user's suppliers → `{ suppliers }`. |
| GET | `/api/analytics` | 🔒 | Catalog metrics: counts per grade, niche fits, per-collection breakdown. |
| GET | `/api/launch-catalog` | 🔒 | The 30-SKU launch pick (+ extras): `{ products, rows, total, target }`. `rows` are spreadsheet-ready for CSV download. |
| GET | `/api/research-notes` | 🔒 | List notes, newest first → `{ notes }`. |
| POST | `/api/research-notes` | 🔒 | Body `{ title, note, productName?, priority? }` → `201` created note. `400` if title/note missing. |

## Error handling

- Expected failures return `4xx` with `{ error: "<human-readable message>" }`.
- Unexpected failures are logged server-side and return a generic
  `500 { error: "Something went wrong on the server. Try again." }` — internal
  details are never leaked to the client.

## Frontend ↔ backend interaction

The React client (`client/src/api.ts`) wraps `fetch`, attaches the JWT from
`localStorage`, and throws on non-2xx responses so pages can show the API's error
message. Dashboard loads run `auth/me`, `products`, `analytics`, and
`research-notes` in parallel.
