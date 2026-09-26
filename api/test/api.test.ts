import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/db.js";

const CATALOG_CSV = [
  "Product Name,Category,Subcategory,Wholesale Price,Min Quantity,Case Pack Quantity,Per Piece Weight,Warehouse",
  "Bamboo Drawer Organizer Set,Home,Storage,9.5,1,1,1.2,US",
  "Desk Organizer Tray with Pen Holder,Office,Desk,11,1,1,1.5,US",
  "Spice Rack Pantry Organizer,Kitchen,Pantry,12,1,1,2.0,US",
  "LED Phone Case Strip,Electronics,Accessories,8,1,1,0.4,CN"
].join("\n");

const app = createApp();

let token = "";

beforeAll(async () => {
  delete process.env.MONGO_URI; // force the in-memory MongoDB
  await connectDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("auth", () => {
  it("rejects registration with a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "short@test.dev", password: "123" });
    expect(res.status).toBe(400);
  });

  it("registers a user and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Owner", email: "owner@test.dev", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
  });

  it("rejects a duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Copy", email: "owner@test.dev", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("logs in with the right password and rejects the wrong one", async () => {
    const good = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@test.dev", password: "password123" });
    expect(good.status).toBe(200);
    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@test.dev", password: "wrong-password" });
    expect(bad.status).toBe(401);
  });

  it("blocks protected routes without a token", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
  });
});

describe("catalog import to launch list", () => {
  it("imports and scores a supplier CSV", async () => {
    const res = await request(app)
      .post("/api/imports/catalog")
      .set("Authorization", `Bearer ${token}`)
      .send({ csvText: CATALOG_CSV });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.products).toHaveLength(4);
    for (const product of res.body.products) {
      expect(product.overall_score).toBeGreaterThan(0);
      expect(["Add Immediately", "Consider", "Test Later", "Skip"]).toContain(product.grade);
    }
  });

  it("rejects an unreadable CSV with a friendly 400", async () => {
    const res = await request(app)
      .post("/api/imports/catalog")
      .set("Authorization", `Bearer ${token}`)
      .send({ csvText: '"broken,unterminated\nrow2,x,y' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/CSV/i);
  });

  it("filters products to US warehouses", async () => {
    const res = await request(app)
      .get("/api/products?usOnly=true")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.products.every((p: { us_based: string }) => p.us_based === "Y")).toBe(true);
  });

  it("reports analytics for the imported catalog", async () => {
    const res = await request(app)
      .get("/api/analytics")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.catalog_size).toBe(4);
  });

  it("builds a US-only launch catalog with spreadsheet rows", async () => {
    const res = await request(app)
      .get("/api/launch-catalog")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.rows.length).toBe(res.body.total);
    expect(res.body.products.every((p: { us_based: string }) => p.us_based === "Y")).toBe(true);
  });
});

describe("research notes and data isolation", () => {
  it("creates and lists a research note", async () => {
    const created = await request(app)
      .post("/api/research-notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Check margins", note: "Bamboo set needs a 50% margin retest." });
    expect(created.status).toBe(201);

    const list = await request(app)
      .get("/api/research-notes")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.notes).toHaveLength(1);
  });

  it("keeps one user's catalog invisible to another user", async () => {
    const second = await request(app)
      .post("/api/auth/register")
      .send({ name: "Other", email: "other@test.dev", password: "password123" });
    const otherToken = second.body.token;

    const products = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(products.body.total).toBe(0);

    const notes = await request(app)
      .get("/api/research-notes")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(notes.body.notes).toHaveLength(0);
  });
});
