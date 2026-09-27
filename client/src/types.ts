export type Grade = "Add Immediately" | "Consider" | "Test Later" | "Skip" | string;

export interface Product {
  id: string;
  name: string;
  grade: Grade;
  overall_score?: number;
  estimated_margin?: number;
  profit_dollars?: number;
  supplier_cost?: number;
  shipping_cost?: number;
  product_price?: number;
  delivery_days?: number;
  delivery_days_label?: string;
  us_based?: string;
  warehouse?: string;
  collection?: string;
  fit_score?: number;
  listing_verdict?: string;
  listing_reason?: string;
  supplier_name?: string;
}

export interface Metrics {
  catalog_size: number;
  add_immediately: number;
  consider: number;
  test_later: number;
  skip: number;
  relevant_to_niche: number;
  by_collection?: Array<{
    collection: string;
    launch_filled: number;
    launch_target: number;
  }>;
}

export interface Note {
  _id: string;
  title: string;
  note: string;
  productName?: string;
  createdAt?: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}
