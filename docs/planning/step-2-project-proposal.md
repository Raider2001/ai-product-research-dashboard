# E-Commerce Product Research Dashboard

Springboard Capstone Project Proposal  
Dave Stevens

## 1. Executive summary

The E-Commerce Product Research Dashboard is a full-stack web application that helps a store owner choose products for an organization store. Supplier catalogs from CJ and TopDawg contain thousands of rows. This app imports a catalog CSV, scores each product for niche fit, profit after Shopify fees, shipping speed, competition, and listing quality, and recommends Add Immediately, Consider, Test Later, or Skip.

The store target is a 30-SKU launch list: 10 Home Organization, 10 Desk and Office, and 10 Kitchen Organization. The dashboard does not write to Shopify. The owner reviews the grades and downloads a short launch file to import on their own.

## 2. Technology stack

- Frontend: React and TypeScript, Vite, React Router, Recharts
- Backend: Node.js, Express, and TypeScript
- Database: MongoDB
- Accounts: signup and login, passwords hashed with bcrypt, sessions with JWT
- Hosting plan: the React app on Vercel, the API on Render, and the database on MongoDB Atlas

An earlier copy of the dashboard used JavaScript and PostgreSQL and had no accounts. This proposal describes the capstone version, which keeps the same product-selection workflow and meets the full-stack, TypeScript, MongoDB, and account requirements.

## 3. Project focus

The project is balanced between frontend and backend. The frontend covers import, filters, charts, the product table, research notes, and the launch download. The backend covers authentication, CSV scoring, per-user data, and the reporting endpoints.

## 4. Project type

Responsive website. The owner uses it in a desktop browser while reviewing a catalog, and the layout still works on a tablet.

## 5. Project goal

Give one clear decision for each supplier product: list it now, consider it, test it later, or skip it. The goal is a 30-product launch list, not a dump of every row in the catalog.

## 6. User demographics

The primary user is the owner of a small Shopify organization store. The same tool fits other solo e-commerce sellers who buy from dropship catalogs and need a profit and shipping check before they add a SKU.

## 7. Data sources and collection

The MVP uses a CSV the owner exports from CJ or TopDawg. The file stays in the dashboard. Future work can add a live supplier API. Shopify is an export target only: the owner downloads the launch list and imports it in Shopify themselves.

## 8. Database schema

Each business record belongs to one user.

- User: name, email, password hash
- Product: user id, source, name, category, collection, cost, shipping, retail price, warehouse, days to ship, fit score, profit, scores, grade, and listing verdict
- Supplier: user id, name, region, lead time, quality score
- Research note: user id, optional product, title, note, priority

Indexes on user id, grade, and overall score keep each account’s catalog and the launch sort fast.

## 9. API design and challenges

REST endpoints cover signup, login, the current user, catalog import, products, suppliers, analytics, the launch list, and research notes. Protected routes require a JWT.

Challenges:

- Supplier CSVs use different column names and repeat the same product once per warehouse. The importer collapses those rows and prefers a US warehouse.
- Scores have to stay stable: niche fit 30%, profit 30%, shipping 20%, competition 10%, quality 10%. Overall 90–100 is Add Immediately, 80–89 Consider, 70–79 Test Later, and below 70 Skip.
- Profit is price minus cost, shipping, Shopify fees (2.9% plus $0.30), and optional ad spend. A 40% margin is the floor and 50% or higher is preferred.
- One user must never see another user’s catalog.

## 10. Security

Passwords are hashed with bcrypt and are never returned by the API. JWT middleware protects catalog and note routes. MongoDB queries always include the logged-in user id. The CSV import is stored for that user only and is not sent to Shopify.

## 11. Core functionality

- Create an account and log in
- Import a product CSV
- Filter to US warehouses, search by name, and filter by grade
- See summary counts and a grade chart
- Read profit, shipping days, and the listing reason on each row
- Save a research note
- Download the 30-SKU launch CSV

## 12. User flow

Landing and login or signup, then the dashboard. The owner imports a CSV, leaves the warehouse filter on US only, sorts by days to ship, reviews grades, saves notes, downloads the launch list, and logs out.

## 13. Features beyond basic storage

The value is the scoring engine, the US-warehouse preference, the grade chart, and the launch-list picker. Those are decision tools, not plain create-read-update-delete screens.

## 14. MVP scope

Accounts, protected routes, CSV import, scoring, filters, charts, research notes, the launch download, and MongoDB persistence.

## 15. Stretch goals

Live CJ or TopDawg APIs, sending the launch list into Shopify, PDF reports, and email summaries. These are out of the MVP.

## 16. Task breakdown

1. Confirm the product decision and this proposal with the mentor
2. Replace the copied JavaScript and PostgreSQL app with the TypeScript API and React client
3. Add signup, login, and per-user catalogs
4. Keep the existing scoring, import, and launch-list behavior
5. Test the path from signup through import, grades, and launch download
6. Deploy to Vercel, Render, and MongoDB Atlas
7. Write the README and the later capstone steps from this same product

The working prototype already proves the scoring workflow. The remaining build is the account model, TypeScript, and MongoDB, which fits the 45–65 hour capstone window.

## 17. GitHub repository

Repository name: `ai-product-research-dashboard`  
App path in this workspace: `dashboard/ai-product-research-dashboard`  
Capstone client: `client`  
Capstone API: `api`

## 18. Conclusion

This proposal keeps the real tool: a dashboard for choosing products for an e-commerce store. It also meets the Springboard requirements of a full-stack app with signup and login, React, TypeScript, and MongoDB.
