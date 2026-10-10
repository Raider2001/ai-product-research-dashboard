import type { ChangeEvent } from "react";
import type { Product } from "../types";

function gradeClass(grade: string) {
  if (grade === "Add Immediately") return "grade grade-add";
  if (grade === "Consider") return "grade grade-consider";
  if (grade === "Test Later") return "grade grade-test";
  return "grade grade-skip";
}

type ProductTableProps = {
  products: Product[];
  onToggleSelect: (ids: string[], selected: boolean) => void;
  onUploadPhotos: (product: Product, event: ChangeEvent<HTMLInputElement>) => void;
};

// The scored catalog table: selection checkboxes, photo upload, and grades.
// State stays in DashboardPage; this component only renders and reports events up.
export default function ProductTable({ products, onToggleSelect, onUploadPhotos }: ProductTableProps) {
  const allVisibleSelected = products.length > 0 && products.every((product) => product.selected);

  return (
    <div className="table-wrap">
      <table>
        <caption className="visually-hidden">Scored products in your catalog</caption>
        <thead>
          <tr>
            <th scope="col">
              <input
                type="checkbox"
                aria-label="Select all visible products"
                checked={allVisibleSelected}
                onChange={(event) => onToggleSelect(products.map((product) => product.id), event.target.checked)}
              />
            </th>
            <th scope="col">Photo</th>
            <th scope="col">Product</th>
            <th scope="col">Collection</th>
            <th scope="col">Days</th>
            <th scope="col">Margin</th>
            <th scope="col">Score</th>
            <th scope="col">Grade</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const thumb = product.image_src || product.uploaded_images?.[0];
            return (
              <tr key={product.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.name}`}
                    checked={product.selected === true}
                    onChange={(event) => onToggleSelect([product.id], event.target.checked)}
                  />
                </td>
                <td>
                  {thumb ? (
                    <img className="thumb" src={thumb} alt={product.image_alt_text || product.name} />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                  <label className="file-button photo-button">
                    Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      aria-label={`Upload photos for ${product.name}`}
                      onChange={(event) => onUploadPhotos(product, event)}
                    />
                  </label>
                </td>
                <td>
                  <strong>{product.name}</strong>
                  <small>{product.listing_reason || product.supplier_name}</small>
                </td>
                <td>{product.collection || "Other"}</td>
                <td>{product.delivery_days_label || product.delivery_days || "—"}</td>
                <td>{product.estimated_margin ?? 0}%</td>
                <td>{product.overall_score ?? 0}</td>
                <td><span className={gradeClass(product.grade)}>{product.grade}</span></td>
              </tr>
            );
          })}
          {products.length === 0 ? (
            <tr>
              <td colSpan={8}>No products match these filters. Import a CSV or turn off US only.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
