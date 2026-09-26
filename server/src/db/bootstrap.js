import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { config } from '../config.js';
import { initializeDatabase } from './schema.js';
import { hasDatabase, query } from './pool.js';
import { mapSampleProduct, mapWorkspaceExport, toNumber } from '../../../shared/productPipeline.js';

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function loadNormalizedProducts() {
  if (fileExists(config.workspaceExportCsv)) {
    return readCsv(config.workspaceExportCsv).map(mapWorkspaceExport);
  }

  if (fileExists(config.sampleProductsCsv)) {
    return readCsv(config.sampleProductsCsv).map(mapSampleProduct);
  }

  return [];
}

function loadSuppliers() {
  if (!fileExists(config.supplierCsv)) {
    return [];
  }

  return readCsv(config.supplierCsv).map((record) => ({
    external_supplier_id: record.supplier_id ? String(record.supplier_id) : null,
    name: record.name,
    region: record.region,
    lead_time_days: toNumber(record.lead_time),
    quality_score: toNumber(record.score),
    shipping_cost_avg: 0,
    source: 'sample-supplier-file',
    raw_payload: record
  }));
}

export async function seedDatabase() {
  if (!hasDatabase()) {
    return { enabled: false, products: 0, suppliers: 0 };
  }

  await initializeDatabase();

  const products = loadNormalizedProducts();
  const suppliers = loadSuppliers();

  for (const product of products) {
    await query(
      `
        INSERT INTO products (
          display_order, source, source_product_id, upc, name, category, subcategory,
          product_price, supplier_cost, shipping_cost, competitor_price, estimated_margin,
          market_score, competition_score, min_quantity, case_pack_quantity, per_piece_weight,
          shortlist_ready, shortlist_reason, consumer_behavior_note, raw_payload, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21::jsonb, NOW()
        )
        ON CONFLICT (source, source_product_id) DO UPDATE SET
          display_order = EXCLUDED.display_order,
          upc = EXCLUDED.upc,
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          product_price = EXCLUDED.product_price,
          supplier_cost = EXCLUDED.supplier_cost,
          shipping_cost = EXCLUDED.shipping_cost,
          competitor_price = EXCLUDED.competitor_price,
          estimated_margin = EXCLUDED.estimated_margin,
          market_score = EXCLUDED.market_score,
          competition_score = EXCLUDED.competition_score,
          min_quantity = EXCLUDED.min_quantity,
          case_pack_quantity = EXCLUDED.case_pack_quantity,
          per_piece_weight = EXCLUDED.per_piece_weight,
          shortlist_ready = EXCLUDED.shortlist_ready,
          shortlist_reason = EXCLUDED.shortlist_reason,
          consumer_behavior_note = EXCLUDED.consumer_behavior_note,
          raw_payload = EXCLUDED.raw_payload,
          updated_at = NOW()
      `,
      [
        product.product_id,
        product.source,
        product.source_product_id,
        product.upc,
        product.name,
        product.category,
        product.subcategory,
        product.product_price,
        product.supplier_cost,
        product.shipping_cost,
        product.competitor_price,
        product.estimated_margin,
        product.market_score,
        product.competition_score,
        product.min_quantity,
        product.case_pack_quantity,
        product.per_piece_weight,
        product.shortlist_ready,
        product.shortlist_reason,
        product.consumer_behavior_note,
        JSON.stringify(product)
      ]
    );
  }

  for (const supplier of suppliers) {
    await query(
      `
        INSERT INTO suppliers (
          external_supplier_id, name, region, lead_time_days, quality_score,
          shipping_cost_avg, source, raw_payload, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (name) DO UPDATE SET
          external_supplier_id = EXCLUDED.external_supplier_id,
          region = EXCLUDED.region,
          lead_time_days = EXCLUDED.lead_time_days,
          quality_score = EXCLUDED.quality_score,
          shipping_cost_avg = EXCLUDED.shipping_cost_avg,
          source = EXCLUDED.source,
          raw_payload = EXCLUDED.raw_payload,
          updated_at = NOW()
      `,
      [
        supplier.external_supplier_id,
        supplier.name,
        supplier.region,
        supplier.lead_time_days,
        supplier.quality_score,
        supplier.shipping_cost_avg,
        supplier.source,
        JSON.stringify(supplier.raw_payload)
      ]
    );
  }

  return { enabled: true, products: products.length, suppliers: suppliers.length };
}

export async function initializePersistence() {
  if (!hasDatabase()) {
    return { mode: 'file-fallback', seeded: false, products: 0, suppliers: 0 };
  }

  await initializeDatabase();

  if (!config.syncOnStartup) {
    return { mode: 'postgres', seeded: false, products: 0, suppliers: 0 };
  }

  const seeded = await seedDatabase();
  return { mode: 'postgres', seeded: true, products: seeded.products, suppliers: seeded.suppliers };
}