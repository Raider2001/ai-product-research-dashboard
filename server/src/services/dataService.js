import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { config } from '../config.js';
import { hasDatabase, query } from '../db/pool.js';
import {
  buildCatalogMetrics,
  enrichCatalogScoring,
  mapSampleProduct,
  mapWorkspaceExport,
  pickLaunchCatalog,
  toNumber
} from '../../../shared/productPipeline.js';

let sessionCatalog = null;

export function setSessionCatalog(products) {
  sessionCatalog = Array.isArray(products) ? products : null;
}

export function getSessionCatalog() {
  return sessionCatalog;
}

function getActiveProductList() {
  if (sessionCatalog) {
    return sessionCatalog;
  }

  return null;
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function normalizeDbProduct(row) {
  const raw = row.raw_payload && typeof row.raw_payload === 'object' && !Array.isArray(row.raw_payload)
    ? row.raw_payload
    : {};

  return enrichCatalogScoring({
    ...raw,
    product_id: Number(row.display_order ?? row.product_id ?? row.id),
    db_id: Number(row.id),
    source_product_id: row.source_product_id,
    upc: row.upc ?? '',
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    product_price: toNumber(row.product_price),
    price: toNumber(row.product_price),
    supplier_cost: toNumber(row.supplier_cost),
    wholesale_price: toNumber(row.supplier_cost),
    shipping_cost: toNumber(row.shipping_cost),
    competitor_price: toNumber(row.competitor_price),
    market_score: toNumber(row.market_score),
    competition_score: toNumber(row.competition_score),
    estimated_margin: toNumber(row.estimated_margin),
    min_quantity: toNumber(row.min_quantity),
    case_pack_quantity: toNumber(row.case_pack_quantity),
    per_piece_weight: toNumber(row.per_piece_weight),
    source: row.source
  });
}

function loadProductsFromFiles() {
  if (config.dataSource === 'workspace-export' && fileExists(config.workspaceExportCsv)) {
    return readCsv(config.workspaceExportCsv).map(mapWorkspaceExport);
  }

  if (fileExists(config.sampleProductsCsv)) {
    return readCsv(config.sampleProductsCsv).map(mapSampleProduct);
  }

  return [];
}

function loadSuppliersFromFiles() {
  if (!fileExists(config.supplierCsv)) {
    return [];
  }

  return readCsv(config.supplierCsv).map((record) => ({
    supplier_id: toNumber(record.supplier_id),
    name: record.name,
    region: record.region,
    lead_time: toNumber(record.lead_time),
    score: toNumber(record.score),
    shipping_cost_avg: 0,
    source: 'sample-supplier-file'
  }));
}

async function listProductsFromDb({ skip = 0, limit = 20 } = {}) {
  const result = await query(
    `
      SELECT *
      FROM products
      ORDER BY shortlist_ready DESC, market_score DESC, display_order ASC
      OFFSET $1 LIMIT $2
    `,
    [skip, limit]
  );

  const totalResult = await query('SELECT COUNT(*)::int AS total FROM products');
  return {
    products: result.rows.map(normalizeDbProduct),
    total: totalResult.rows[0]?.total ?? 0,
    skip,
    limit
  };
}

async function listAllProductsFromDb() {
  const result = await query(
    `
      SELECT *
      FROM products
      ORDER BY shortlist_ready DESC, market_score DESC, display_order ASC
    `
  );

  return result.rows.map(normalizeDbProduct);
}

export async function getProducts({ skip = 0, limit = 20 } = {}) {
  const session = getActiveProductList();
  if (session) {
    return {
      products: session.slice(skip, skip + limit),
      total: session.length,
      skip,
      limit,
      source: 'uploaded-session'
    };
  }

  if (hasDatabase() && config.dataSource === 'postgres') {
    return listProductsFromDb({ skip, limit });
  }

  const products = loadProductsFromFiles();
  return {
    products: products.slice(skip, skip + limit),
    total: products.length,
    skip,
    limit
  };
}

export async function getProductById(productId) {
  const session = getActiveProductList();
  if (session) {
    return session.find((product) => product.product_id === Number(productId)) ?? null;
  }

  if (hasDatabase() && config.dataSource === 'postgres') {
    const result = await query(
      `
        SELECT *
        FROM products
        WHERE display_order = $1 OR id = $1
        LIMIT 1
      `,
      [Number(productId)]
    );

    return result.rows[0] ? normalizeDbProduct(result.rows[0]) : null;
  }

  return loadProductsFromFiles().find((product) => product.product_id === Number(productId)) ?? null;
}

export async function searchProducts(searchTerm) {
  const queryText = String(searchTerm).trim();
  if (!queryText) {
    return [];
  }

  const session = getActiveProductList();
  if (session) {
    const lowered = queryText.toLowerCase();
    return session.filter((product) => {
      return [product.name, product.category, product.subcategory, product.warehouse, product.ship_from]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(lowered));
    });
  }

  if (hasDatabase() && config.dataSource === 'postgres') {
    const result = await query(
      `
        SELECT *
        FROM products
        WHERE name ILIKE $1 OR category ILIKE $1 OR subcategory ILIKE $1
        ORDER BY shortlist_ready DESC, market_score DESC, display_order ASC
        LIMIT 100
      `,
      [`%${queryText}%`]
    );

    return result.rows.map(normalizeDbProduct);
  }

  const lowered = queryText.toLowerCase();
  return loadProductsFromFiles().filter((product) => {
    return [product.name, product.category, product.subcategory]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(lowered));
  });
}

export async function getSuppliers() {
  if (hasDatabase() && config.dataSource === 'postgres') {
    const result = await query(
      `
        SELECT
          id AS supplier_id,
          name,
          region,
          lead_time_days AS lead_time,
          quality_score AS score,
          shipping_cost_avg,
          source
        FROM suppliers
        ORDER BY quality_score DESC NULLS LAST, name ASC
      `
    );

    return {
      suppliers: result.rows.map((row) => ({
        supplier_id: toNumber(row.supplier_id),
        name: row.name,
        region: row.region,
        lead_time: toNumber(row.lead_time),
        score: toNumber(row.score),
        shipping_cost_avg: toNumber(row.shipping_cost_avg),
        source: row.source
      })),
      total: result.rowCount
    };
  }

  const suppliers = loadSuppliersFromFiles();
  return {
    suppliers,
    total: suppliers.length
  };
}

export async function getAllProducts() {
  const session = getActiveProductList();
  if (session) {
    return session;
  }

  if (hasDatabase() && config.dataSource === 'postgres') {
    return listAllProductsFromDb();
  }

  return loadProductsFromFiles();
}

export async function getAnalytics() {
  const products = await getAllProducts();
  if (products.length === 0) {
    return {
      total_products: 0,
      avg_price: 0,
      avg_supplier_cost: 0,
      avg_shipping_cost: 0,
      avg_competitor_price: 0,
      avg_market_score: 0,
      avg_estimated_margin: 0,
      shortlist_ready_count: 0,
      catalog: buildCatalogMetrics([]),
      launch_catalog_count: 0,
      launch_target: 30,
      add_immediately_count: 0,
      consider_count: 0,
      test_later_count: 0,
      skip_count: 0,
      relevant_to_niche: 0,
      high_quality: 0,
      us_warehouse_count: 0,
      price_range: { min: 0, max: 0 },
      categories: []
    };
  }

  const prices = products.map((product) => product.product_price ?? product.price);
  const supplierCosts = products.map((product) => product.supplier_cost);
  const shippingCosts = products.map((product) => product.shipping_cost);
  const competitorPrices = products.map((product) => product.competitor_price);
  const marketScores = products.map((product) => product.market_score);
  const margins = products.map((product) => product.estimated_margin);
  const shortlistReadyCount = products.filter((product) => product.shortlist_ready).length;

  const average = (values) => Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));

  const catalog = buildCatalogMetrics(products);
  const launchCatalog = pickLaunchCatalog(products);

  return {
    total_products: products.length,
    avg_price: average(prices),
    avg_supplier_cost: average(supplierCosts),
    avg_shipping_cost: average(shippingCosts),
    avg_competitor_price: average(competitorPrices),
    avg_market_score: Number((marketScores.reduce((sum, value) => sum + value, 0) / products.length).toFixed(1)),
    avg_estimated_margin: Number((margins.reduce((sum, value) => sum + value, 0) / products.length).toFixed(1)),
    shortlist_ready_count: shortlistReadyCount,
    catalog,
    launch_catalog_count: launchCatalog.length,
    launch_target: catalog.launch_target_total,
    add_immediately_count: catalog.add_immediately,
    consider_count: catalog.consider,
    test_later_count: catalog.test_later,
    skip_count: catalog.skip,
    relevant_to_niche: catalog.relevant_to_niche,
    high_quality: catalog.high_quality,
    us_warehouse_count: products.filter((product) => product.us_based === 'Y').length,
    price_range: {
      min: Math.min(...prices),
      max: Math.max(...prices)
    },
    categories: [...new Set(products.map((product) => product.collection || product.category))]
  };
}

export async function getOpportunityScores() {
  const products = await getAllProducts();

  return products
    .sort((left, right) => (right.overall_score ?? 0) - (left.overall_score ?? 0))
    .slice(0, 80)
    .map((product) => ({
      name: product.name,
      collection: product.collection,
      grade: product.grade,
      demand: product.fit_score * 20,
      competition: product.competition_grade * 20,
      opportunity_score: product.overall_score ?? product.opportunity_score,
      listing_verdict: product.listing_verdict,
      reasoning: `${product.listing_verdict || product.grade}: ${product.listing_reason || product.decision_reason} ${product.consumer_behavior_note || ''}`.trim()
    }));
}

export async function getLaunchCatalog() {
  return pickLaunchCatalog(await getAllProducts(), undefined, { usOnly: true });
}