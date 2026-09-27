import { describe, expect, it } from "vitest";
import {
  calculateShopifyFees,
  calculateUnitEconomics,
  gradeFromOverallScore,
  enrichCatalogScoring,
  pickLaunchCatalog
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
