import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import GradeChart from "../components/GradeChart";
import NotesPanel from "../components/NotesPanel";
import ProductTable from "../components/ProductTable";
import StatsBar from "../components/StatsBar";
import { MAX_IMAGES_PER_PRODUCT, filesToDataUrls } from "../imageTools";
import { filesToCsvTexts } from "../importFiles";
import type { Metrics, Note, Product, SessionUser } from "../types";

function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
  ];
  return lines.join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type Status = { kind: "info" | "success" | "error"; text: string } | null;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, setUser, logout: clearAuth } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [usOnly, setUsOnly] = useState(true);
  const [grade, setGrade] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>(null);

  async function load() {
    const params = new URLSearchParams({
      usOnly: String(usOnly),
      grade,
      q: query
    });
    const [me, catalog, summary, noteList] = await Promise.all([
      api<{ user: SessionUser }>("/api/auth/me"),
      api<{ products: Product[] }>(`/api/products?${params.toString()}`),
      api<Metrics>("/api/analytics"),
      api<{ notes: Note[] }>("/api/research-notes")
    ]);
    setUser(me.user);
    setProducts(catalog.products);
    setMetrics(summary);
    setNotes(noteList.notes);
  }

  useEffect(() => {
    load().catch((error: unknown) => {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Could not load the dashboard" });
      if (error instanceof Error && error.message.toLowerCase().includes("log in")) {
        clearAuth();
        navigate("/login");
      }
    });
  }, [usOnly, grade]);

  const chartData = useMemo(
    () => [
      { grade: "Add", count: metrics?.add_immediately ?? 0 },
      { grade: "Consider", count: metrics?.consider ?? 0 },
      { grade: "Test", count: metrics?.test_later ?? 0 },
      { grade: "Skip", count: metrics?.skip ?? 0 }
    ],
    [metrics]
  );

  const chartSummary = `Grade distribution. Add Immediately: ${metrics?.add_immediately ?? 0}. Consider: ${metrics?.consider ?? 0}. Test Later: ${metrics?.test_later ?? 0}. Skip: ${metrics?.skip ?? 0}.`;
  const selectedCount = products.filter((product) => product.selected).length;

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setStatus({ kind: "info", text: `Converting and scoring ${files.length} file(s)...` });
    try {
      const csvTexts = await filesToCsvTexts(files);
      const result = await api<{ message: string; total: number }>("/api/imports/catalog", {
        method: "POST",
        body: JSON.stringify({ csvTexts })
      });
      setStatus({ kind: "success", text: `${result.message} ${result.total} products saved from ${files.length} file(s).` });
      await load();
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Import failed" });
    } finally {
      event.target.value = "";
    }
  }

  async function updateSelection(ids: string[], selected: boolean) {
    if (ids.length === 0) return;
    try {
      await api("/api/products/selection", {
        method: "POST",
        body: JSON.stringify({ ids, selected })
      });
      setProducts((prev) => prev.map((product) => (ids.includes(product.id) ? { ...product, selected } : product)));
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Could not update the selection" });
    }
  }

  async function onUploadPhotos(product: Product, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setStatus({ kind: "info", text: "Resizing and saving photos..." });
    try {
      const images = await filesToDataUrls(files, MAX_IMAGES_PER_PRODUCT);
      const result = await api<{ product: Product; message: string }>(`/api/products/${product.id}/images`, {
        method: "POST",
        body: JSON.stringify({ images })
      });
      setProducts((prev) => prev.map((item) => (item.id === product.id ? result.product : item)));
      setStatus({ kind: "success", text: result.message });
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Photo upload failed" });
    } finally {
      event.target.value = "";
    }
  }

  async function downloadLaunch() {
    const result = await api<{ rows: Array<Record<string, unknown>>; total: number }>("/api/launch-catalog");
    downloadCsv(rowsToCsv(result.rows), "launch-catalog.csv");
    setStatus({ kind: "success", text: `Downloaded ${result.total} launch products.` });
  }

  async function downloadShopify() {
    try {
      const result = await api<{ rows: Array<Record<string, string>>; product_count: number; skipped_no_image: number }>(
        "/api/exports/shopify"
      );
      if (result.product_count === 0) {
        setStatus({ kind: "error", text: "Select at least one product first (use the checkboxes)." });
        return;
      }
      // UTF-8 BOM so Excel opens the file with correct characters.
      downloadCsv("﻿" + rowsToCsv(result.rows), "shopify-products.csv");
      const imageNote = result.skipped_no_image
        ? ` ${result.skipped_no_image} product(s) have no hosted image URL, so they export without photos.`
        : "";
      setStatus({
        kind: "success",
        text: `Exported ${result.product_count} products for Shopify. Import the file in Shopify Admin > Products > Import.${imageNote}`
      });
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Shopify export failed" });
    }
  }

  async function createNote(title: string, note: string) {
    try {
      await api("/api/research-notes", {
        method: "POST",
        body: JSON.stringify({ title, note })
      });
      await load();
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Could not save the note" });
      throw error;
    }
  }

  function logout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Product research</p>
          <h1>Launch catalog</h1>
        </div>
        <div className="topbar-actions">
          <span>{user?.email}</span>
          <button type="button" className="ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="toolbar">
        <label className="check">
          <input type="checkbox" checked={usOnly} onChange={(event) => setUsOnly(event.target.checked)} />
          US warehouse only
        </label>
        <select value={grade} aria-label="Filter by grade" onChange={(event) => setGrade(event.target.value)}>
          <option value="all">All grades</option>
          <option>Add Immediately</option>
          <option>Consider</option>
          <option>Test Later</option>
          <option>Skip</option>
        </select>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            load().catch((error: unknown) =>
              setStatus({ kind: "error", text: error instanceof Error ? error.message : "Search failed" })
            );
          }}
        >
          <input
            value={query}
            aria-label="Search product name"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product name (press Enter)"
          />
        </form>
        <button
          type="button"
          disabled={grade === "all"}
          onClick={() => updateSelection(products.filter((product) => product.grade === grade).map((product) => product.id), true)}
        >
          Select all {grade === "all" ? "(pick a grade)" : grade}
        </button>
        <label className="file-button">
          Import CSV / Excel
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            aria-label="Import catalog files (CSV or Excel)"
            onChange={onImport}
          />
        </label>
        <button type="button" onClick={downloadLaunch}>Download launch list</button>
        <button type="button" onClick={downloadShopify}>
          Export selected to Shopify{selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>
      </section>

      <p role="status" aria-live="polite" className={status ? `status status-${status.kind}` : "visually-hidden"}>
        {status?.text ?? ""}
      </p>

      <StatsBar metrics={metrics} />

      <section className="workspace">
        <div className="panel">
          <h2>Grades</h2>
          <GradeChart data={chartData} summary={chartSummary} />
          <ProductTable products={products} onToggleSelect={updateSelection} onUploadPhotos={onUploadPhotos} />
        </div>

        <NotesPanel notes={notes} onCreate={createNote} />
      </section>
    </div>
  );
}
