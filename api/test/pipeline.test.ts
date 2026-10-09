import { describe, expect, it } from "vitest";
import { importCsvCatalogs } from "../../server/src/services/importService.js";
import {
  SHOPIFY_CSV_COLUMNS,
  buildShopifyExportRows,
  calculateShopifyFees,
  calculateUnitEconomics,
  gradeFromOverallScore,
  enrichCatalogScoring,
  pickLaunchCatalog,
  toShopifyCsvRows
} from "../../shared/productPipeline.js";

describe("Shopify fee and profit math", () => {
  it("charges 2.9% plus 30 cents", () => {
    expect(calculateShopifyFees(100)).toBeCloseTo(3.2, 2);
    expect(calculateShopifyFees(0)).toBeCloseTo(0.3, 2);
  });

  it("computes profit and margin after cost, shipping, fees, and ads", () => {
    const { shopify_fees, profit_dollars, estimated_margin } = calculateUnitEconomics(39.99, 12, 5, 0);
    expect(shopify_fees).toBeCloseTo(1.46, 2);
    expect(profit_dollars).toBeCloseTo(39.99 - 12 - 5 - shopify_fees, 2);
    expect(estimated_margin).toBeGreaterThan(40);
  });

  it("returns zero margin when the selling price is zero", () => {
    const { estimated_margin } = calculateUnitEconomics(0, 5, 2, 0);
    expect(estimated_margin).toBe(0);
  });
});

describe("Grading bands", () => {
  it("maps overall scores to the four grades", () => {
    expect(gradeFromOverallScore(95)).toBe("Add Immediately");
    expect(gradeFromOverallScore(85)).toBe("Consider");
    expect(gradeFromOverallScore(75)).toBe("Test Later");
    expect(gradeFromOverallScore(60)).toBe("Skip");
  });
});

describe("Catalog scoring", () => {
  const usProduct = {
    product_id: 1,
    name: "Bamboo Drawer Organizer Set",
    category: "Home",
    subcategory: "Storage",
    product_price: 29.99,
    price: 29.99,
    supplier_cost: 9.5,
    shipping_cost: 4,
    warehouse: "US",
    ship_from: "US",
    shipping_time: "3-5 days",
    image_urls: ["https://example.com/drawer.jpg"],
    supplier_name: "US Home Supply"
  };

  it("scores a US organization product with the full field set", () => {
    const scored = enrichCatalogScoring({ ...usProduct });
    expect(scored.us_based).toBe("Y");
    expect(scored.overall_score).toBeGreaterThan(0);
    expect(scored.overall_score).toBeLessThanOrEqual(100);
    expect(["Add Immediately", "Consider", "Test Later", "Skip"]).toContain(scored.grade);
    expect(scored.fit_score).toBeGreaterThanOrEqual(1);
    expect(scored.estimated_margin).toBeGreaterThan(0);
  });

  it("keeps non-US warehouses out of a US-only launch catalog", () => {
    const scoredUs = enrichCatalogScoring({ ...usProduct });
    const scoredCn = enrichCatalogScoring({
      ...usProduct,
      product_id: 2,
      name: "Slow Boat Organizer",
      warehouse: "CN",
      ship_from: "CN",
      shipping_time: "15-25 days"
    });
    const launch = pickLaunchCatalog([scoredUs, scoredCn], 10, { usOnly: true });
    expect(launch.every((product) => product.us_based === "Y")).toBe(true);
  });
});

describe("Multi-file catalog import", () => {
  const HEADER = "Product Name,Category,Subcategory,Wholesale Price,Min Quantity,Case Pack Quantity,Per Piece Weight,Warehouse";
  const FILE_CN = [HEADER, "Spice Rack Pantry Organizer,Kitchen,Pantry,12,1,1,2.0,CN"].join("\n");
  const FILE_US = [HEADER, "Spice Rack Pantry Organizer,Kitchen,Pantry,12,1,1,2.0,US"].join("\n");

  it("merges records across files before collapsing so duplicates dedupe", () => {
    const imported = importCsvCatalogs([FILE_CN, FILE_US]);
    expect(imported.total).toBe(1);
    expect(imported.products[0].us_based).toBe("Y");
    expect(imported.file_count).toBe(2);
  });

  it("sums raw row counts across files", () => {
    const imported = importCsvCatalogs([FILE_CN, FILE_US]);
    expect(imported.raw_row_count).toBe(2);
    expect(imported.collapsed_row_count).toBe(1);
  });
});

describe("Shopify export rows", () => {
  const exportProduct = {
    product_id: 7,
    source_product_id: "SKU-777",
    name: "Spice Rack Pantry Organizer",
    category: "Kitchen",
    subcategory: "Pantry",
    collection: "Kitchen Organization",
    supplier_name: "US Home Supply",
    product_price: 29.99,
    list_price_recommended: 32.5,
    per_piece_weight: 1.2,
    image_urls: ["https://example.com/a.jpg", "https://example.com/b.jpg", "https://example.com/c.jpg"],
    image_alt_text: "Three tier spice rack",
    fit_reason: "Perfect fit for Kitchen Organization."
  };

  it("builds a main row with every Shopify column", () => {
    const rows = toShopifyCsvRows({ ...exportProduct }, "spice-rack-pantry-organizer");
    expect(Object.keys(rows[0])).toEqual(SHOPIFY_CSV_COLUMNS);
    expect(rows[0].Published).toBe("TRUE");
    expect(rows[0]["Option1 Value"]).toBe("Default Title");
    expect(rows[0]["Variant Inventory Policy"]).toBe("deny");
    expect(rows[0]["Variant Price"]).toBe("32.50");
    expect(rows[0].Status).toBe("active");
  });

  it("converts per-piece weight from pounds to grams", () => {
    const rows = toShopifyCsvRows({ ...exportProduct }, "spice-rack");
    expect(rows[0]["Variant Grams"]).toBe("544");
  });

  it("adds extra image rows with only Handle and Image Src filled", () => {
    const rows = toShopifyCsvRows({ ...exportProduct }, "spice-rack");
    expect(rows).toHaveLength(3);
    expect(rows[1].Handle).toBe("spice-rack");
    expect(rows[1]["Image Src"]).toBe("https://example.com/b.jpg");
    expect(rows[1].Title).toBe("");
    expect(rows[2]["Image Src"]).toBe("https://example.com/c.jpg");
  });

  it("excludes uploaded data-URL images from the export", () => {
    const rows = toShopifyCsvRows(
      { ...exportProduct, image_urls: ["data:image/jpeg;base64,abc123", "https://example.com/real.jpg"] },
      "spice-rack"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]["Image Src"]).toBe("https://example.com/real.jpg");
  });

  it("dedupes colliding handles across products", () => {
    const built = buildShopifyExportRows([
      { ...exportProduct, name: "Spice Rack", image_urls: [] },
      { ...exportProduct, product_id: 8, name: "Spice Rack", image_urls: [] }
    ]);
    expect(built.rows[0].Handle).toBe("spice-rack");
    expect(built.rows[1].Handle).toBe("spice-rack-2");
    expect(built.skipped_no_image).toBe(2);
  });
});
