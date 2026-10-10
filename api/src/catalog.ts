import mongoose from "mongoose";
import { importCsvCatalogs } from "../../server/src/services/importService.js";
import {
  buildCatalogMetrics,
  buildShopifyExportRows,
  enrichCatalogScoring,
  pickLaunchCatalog,
  toSelectionSpreadsheetRow
} from "../../shared/productPipeline.js";
import { Product, Supplier } from "./models.js";

type CatalogProduct = Record<string, unknown>;

export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_IMAGE_DATA_URL_CHARS = 400_000;

export function publicProduct(doc: { _id: unknown; selected?: boolean; payload: CatalogProduct }): CatalogProduct & { id: string; selected: boolean } {
  return {
    ...doc.payload,
    id: String(doc._id),
    selected: doc.selected === true
  };
}

export async function productsForUser(userId: string) {
  const docs = await Product.find({ userId }).sort({ overallScore: -1 });
  return docs.map((doc) => publicProduct(doc));
}

export async function replaceCatalog(userId: string, csvTexts: string[]) {
  const imported = importCsvCatalogs(csvTexts);
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
        selected: false,
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

export async function setSelection(userId: string, ids: string[], selected: boolean) {
  const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
  if (validIds.length === 0) {
    return 0;
  }

  const result = await Product.updateMany(
    { _id: { $in: validIds }, userId },
    { $set: { selected, "payload.selected": selected } }
  );
  return result.modifiedCount;
}

export async function shopifyExport(userId: string) {
  const docs = await Product.find({ userId, selected: true }).sort({ overallScore: -1 });
  const products = docs.map((doc) => publicProduct(doc));
  const built = buildShopifyExportRows(products);

  return {
    rows: built.rows,
    total: built.rows.length,
    product_count: products.length,
    skipped_no_image: built.skipped_no_image
  };
}

type AddImagesResult =
  | { product: ReturnType<typeof publicProduct> }
  | { error: string; status: number };

export async function addProductImages(userId: string, productId: string, images: unknown): Promise<AddImagesResult> {
  if (!mongoose.isValidObjectId(productId)) {
    return { error: "Product not found.", status: 404 };
  }

  const list = Array.isArray(images) ? images : [];
  if (list.length === 0) {
    return { error: "Choose at least one photo.", status: 400 };
  }

  const allValid = list.every(
    (image) =>
      typeof image === "string" &&
      image.startsWith("data:image/") &&
      image.includes(";base64,") &&
      image.length <= MAX_IMAGE_DATA_URL_CHARS
  );
  if (!allValid) {
    return { error: "Photos must be images under about 300KB each.", status: 400 };
  }

  const doc = await Product.findOne({ _id: productId, userId });
  if (!doc) {
    return { error: "Product not found.", status: 404 };
  }

  const payload = doc.payload as CatalogProduct;
  const existing = Array.isArray(payload.uploaded_images) ? (payload.uploaded_images as string[]) : [];
  if (existing.length + list.length > MAX_IMAGES_PER_PRODUCT) {
    return { error: `Each product can hold up to ${MAX_IMAGES_PER_PRODUCT} uploaded photos.`, status: 400 };
  }

  payload.uploaded_images = [...existing, ...(list as string[])];
  // The scoring pipeline counts embedded_images toward the quality score.
  payload.embedded_images = payload.uploaded_images;
  enrichCatalogScoring(payload);

  doc.grade = String(payload.grade || "Skip");
  doc.overallScore = Number(payload.overall_score) || 0;
  doc.markModified("payload");
  await doc.save();

  return { product: publicProduct(doc) };
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
