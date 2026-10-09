import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireUser, signToken } from "./auth.js";
import {
  addProductImages,
  catalogMetrics,
  launchCatalog,
  productsForUser,
  replaceCatalog,
  setSelection,
  shopifyExport
} from "./catalog.js";
import { Product, ResearchNote, Supplier, User } from "./models.js";

export function createApp() {
  const app = express();
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: "40mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", backend: "typescript", database: "mongodb" });
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const name = String(req.body?.name || "").trim();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!name || !email || password.length < 8) {
        res.status(400).json({ error: "Name, email, and a password of at least 8 characters are required." });
        return;
      }

      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ error: "An account with that email already exists." });
        return;
      }

      const user = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10)
      });
      res.status(201).json({
        token: signToken(user.id),
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Email or password is incorrect." });
        return;
      }

      res.json({
        token: signToken(user.id),
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/me", requireUser, (req, res) => {
    res.json({ user: req.user });
  });

  app.get("/api/products", requireUser, async (req, res, next) => {
    try {
      const grade = String(req.query.grade || "all");
      const usOnly = String(req.query.usOnly || "false") === "true";
      const query = String(req.query.q || "").trim().toLowerCase();
      let products = await productsForUser(req.user!.id);

      if (usOnly) {
        products = products.filter((product) => product.us_based === "Y");
      }
      if (grade !== "all") {
        products = products.filter((product) => product.grade === grade);
      }
      if (query) {
        products = products.filter((product) => String(product.name || "").toLowerCase().includes(query));
      }

      products.sort((left, right) => Number(left.delivery_days || 99) - Number(right.delivery_days || 99));
      res.json({ products, total: products.length });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/imports/catalog", requireUser, async (req, res, next) => {
    try {
      const single = String(req.body?.csvText || req.body?.csv || "");
      const many = Array.isArray(req.body?.csvTexts)
        ? req.body.csvTexts.map((text: unknown) => String(text)).filter((text: string) => text.trim())
        : [];
      const csvTexts = many.length > 0 ? many : single.trim() ? [single] : [];

      if (csvTexts.length === 0) {
        res.status(400).json({ error: "Upload a CSV or Excel export from CJ or TopDawg first." });
        return;
      }
      if (csvTexts.length > 10) {
        res.status(400).json({ error: "Import 10 files or fewer at a time." });
        return;
      }

      let imported;
      try {
        imported = await replaceCatalog(req.user!.id, csvTexts);
      } catch (importError) {
        console.error("CSV import failed:", importError);
        res.status(400).json({ error: "Could not read that file. Upload a CSV or Excel export from CJ or TopDawg." });
        return;
      }
      res.json({
        ...imported,
        products: await productsForUser(req.user!.id),
        message: "Catalog saved to your account. Nothing was sent to Shopify."
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/products/selection", requireUser, async (req, res, next) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id: unknown) => String(id)) : [];
      const selected = req.body?.selected === true;

      if (ids.length === 0) {
        res.status(400).json({ error: "Pick at least one product first." });
        return;
      }
      if (ids.length > 2000) {
        res.status(400).json({ error: "Too many products in one request." });
        return;
      }

      const updated = await setSelection(req.user!.id, ids, selected);
      res.json({ updated, selected });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/products/:id/images", requireUser, async (req, res, next) => {
    try {
      const result = await addProductImages(req.user!.id, String(req.params.id), req.body?.images);
      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ product: result.product, message: "Photos saved. Quality score refreshed." });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/exports/shopify", requireUser, async (req, res, next) => {
    try {
      res.json(await shopifyExport(req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/products", requireUser, async (req, res, next) => {
    try {
      await Product.deleteMany({ userId: req.user!.id });
      await Supplier.deleteMany({ userId: req.user!.id });
      res.json({ cleared: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/suppliers", requireUser, async (req, res, next) => {
    try {
      const suppliers = await Supplier.find({ userId: req.user!.id }).sort({ name: 1 });
      res.json({ suppliers });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/analytics", requireUser, async (req, res, next) => {
    try {
      res.json(await catalogMetrics(req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/launch-catalog", requireUser, async (req, res, next) => {
    try {
      res.json(await launchCatalog(req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/research-notes", requireUser, async (req, res, next) => {
    try {
      const notes = await ResearchNote.find({ userId: req.user!.id }).sort({ createdAt: -1 });
      res.json({ notes });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/research-notes", requireUser, async (req, res, next) => {
    try {
      const title = String(req.body?.title || "").trim();
      const note = String(req.body?.note || "").trim();
      if (!title || !note) {
        res.status(400).json({ error: "A title and a note are required." });
        return;
      }

      const created = await ResearchNote.create({
        userId: req.user!.id,
        title,
        note,
        productName: String(req.body?.productName || "").trim(),
        priority: String(req.body?.priority || "medium")
      });
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  // In production (Render) the API also serves the built React client, so the whole
  // app runs as one web service on one origin.
  if (process.env.SERVE_CLIENT === "true") {
    const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api") || req.path === "/health") {
        next();
        return;
      }
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Something went wrong on the server. Try again." });
  });

  return app;
}
