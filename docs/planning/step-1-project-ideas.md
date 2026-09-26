# Capstone Step 1 — Initial Project Ideas

Dave Stevens · Springboard Software Engineering Capstone

Three project ideas were considered. **Idea 1 was selected** and approved by my mentor.

---

## Idea 1 (SELECTED): E-Commerce Product Research Dashboard

A full-stack web application that helps an online store owner decide which products to
sell. Supplier catalogs from CJdropshipping and TopDawg contain thousands of rows.
The app imports a catalog CSV, scores every product for niche fit, profit after Shopify
fees, shipping speed, competition, and listing quality, then recommends
Add Immediately / Consider / Test Later / Skip and builds a 30-product launch list.

- **Problem:** picking 30 good products out of a 5,000-row supplier dump is slow and
  error-prone; sellers list junk that never turns a profit.
- **Data:** supplier catalog CSV exports (CJ/TopDawg) imported through the app's own
  REST API; user accounts, scores, and research notes stored in MongoDB.
- **Why it interests me:** I am building a real Shopify organization store, so this tool
  gets used for actual business decisions, not just as a demo.

## Idea 2: Small Business Analytics Dashboard

A dashboard that helps small business owners monitor revenue, expenses, profit,
customer activity, and sales trends through interactive charts and reports.

- **Problem:** owners track finances across spreadsheets and apps with no single view.
- **Data:** user-entered revenue/expense/customer records stored in MongoDB, exposed
  through the app's own API.
- **Why not chosen:** valuable, but mostly CRUD screens over financial records; the
  product research idea has a more distinctive scoring engine and a real end user (me).

## Idea 3: Dropship Supplier Order Tracker

An app that tracks orders placed with dropship suppliers: order status, shipping
progress, delivery estimates, and supplier reliability over time.

- **Problem:** once a store has orders across multiple suppliers, tracking fulfillment
  and spotting slow suppliers requires digging through emails and portals.
- **Data:** order and shipment records entered or imported by the user, plus shipping
  carrier tracking APIs where available.
- **Why not chosen:** depends on data that only exists after a store is live and
  selling; the product research dashboard is the tool needed first.
