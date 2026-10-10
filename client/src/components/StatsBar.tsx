import type { Metrics } from "../types";

// The four headline numbers across the top of the dashboard.
export default function StatsBar({ metrics }: { metrics: Metrics | null }) {
  return (
    <section className="stats">
      <article><span>Catalog</span><strong>{metrics?.catalog_size ?? 0}</strong></article>
      <article><span>Add now</span><strong>{metrics?.add_immediately ?? 0}</strong></article>
      <article><span>Consider</span><strong>{metrics?.consider ?? 0}</strong></article>
      <article><span>Niche fits</span><strong>{metrics?.relevant_to_niche ?? 0}</strong></article>
    </section>
  );
}
