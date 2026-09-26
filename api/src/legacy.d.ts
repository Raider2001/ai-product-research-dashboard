declare module "*.js" {
  const value: Record<string, (...args: never[]) => unknown>;
  export function importCsvCatalog(csvText: string): {
    products: Array<Record<string, unknown>>;
    total: number;
    raw_row_count: number;
    collapsed_row_count: number;
    us_warehouse_count: number;
    non_us_count: number;
  };
  export function enrichCatalogScoring(product: Record<string, unknown>): Record<string, unknown>;
  export function buildCatalogMetrics(products?: Array<Record<string, unknown>>): Record<string, unknown>;
  export function pickLaunchCatalog(
    products?: Array<Record<string, unknown>>,
    perCollection?: number,
    options?: { usOnly?: boolean }
  ): Array<Record<string, unknown>>;
  export function toSelectionSpreadsheetRow(product: Record<string, unknown>): Record<string, unknown>;
  export default value;
}
