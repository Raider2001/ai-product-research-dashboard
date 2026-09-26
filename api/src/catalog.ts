import { importCsvCatalog } from "../../server/src/services/importService.js";
import {
  buildCatalogMetrics,
  enrichCatalogScoring,
  pickLaunchCatalog,
  toSelectionSpreadsheetRow
} from "../../shared/productPipeline.js";
import { Product, Supplier } from "./models.js";

type CatalogProduct = Record<string, unknown>;

export function publicProduct(doc: { _id: unknown; payload: CatalogProduct }) {
  return {
    ...doc.payload,
    id: String(doc._id)
  };
}

export async function productsForUser(userId: string) {
  const docs = await Product.find({ userId }).sort({ overallScore: -1 });
  return docs.map((doc) => publicProduct(doc));
}

export async function replaceCatalog(userId: string, csvText: string) {
  const imported = importCsvCatalog(csvText);
  await Product.deleteMany({ userId });
  await Supplier.deleteMany({ userId });

  if (imported.products.length > 0) {
    await Product.insertMany(
      imported.products.map((product) => ({
        userId,
        productId: Number(product.product_id) || 0,
        name: String(product.name || "Untitled"),
        grade: String(product.grade || "Skip"),
        usBased: String(product.us_based || "N"),
        overallScore: Number(product.overall_score) || 0,
        collectionId: String(product.collection_id || ""),
        supplierName: String(product.supplier_name || "Unknown"),
        payload: product
      }))
    );
  }

  const supplierNames = [...new Set(imported.products.map((product) => String(product.supplier_name || "Unknown")))];
  if (supplierNames.length > 0) {
    await Supplier.insertMany(
      supplierNames.map((name) => ({
        userId,
        name,
        region: name.toLowerCase().includes("us") ? "US" : "",
        qualityScore: null,
        leadTimeDays: null
      }))
    );
  }

  return imported;
}

export async function catalogMetrics(userId: string) {
  return buildCatalogMetrics(await productsForUser(userId));
}

export async function launchCatalog(userId: string) {
  const products = await productsForUser(userId);
  const selected = pickLaunchCatalog(products, 10, { usOnly: true });
  return {
    products: selected,
    rows: selected.map((product) => toSelectionSpreadsheetRow(product)),
    total: selected.length,
    target: 30
  };
}

export function scoreSample(product: CatalogProduct) {
  return enrichCatalogScoring(product);
}
