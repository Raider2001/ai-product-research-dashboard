import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import type { Metrics, Note, Product, SessionUser } from "../types";

function gradeClass(grade: string) {
  if (grade === "Add Immediately") return "grade grade-add";
  if (grade === "Consider") return "grade grade-consider";
  if (grade === "Test Later") return "grade grade-test";
  return "grade grade-skip";
}

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, setUser, logout: clearAuth } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [usOnly, setUsOnly] = useState(true);
  const [grade, setGrade] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

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
      setStatus(error instanceof Error ? error.message : "Could not load the dashboard");
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

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Scoring catalog...");
    const csvText = await file.text();
    try {
      const result = await api<{ message: string; total: number }>("/api/imports/catalog", {
        method: "POST",
        body: JSON.stringify({ csvText })
      });
      setStatus(`${result.message} ${result.total} products saved.`);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed");
    } finally {
      event.target.value = "";
    }
  }

  async function downloadLaunch() {
    const result = await api<{ rows: Array<Record<string, unknown>>; total: number }>("/api/launch-catalog");
    const csv = rowsToCsv(result.rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "launch-catalog.csv";
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${result.total} launch products.`);
  }

  async function onNote(event: FormEvent) {
    event.preventDefault();
    await api("/api/research-notes", {
      method: "POST",
      body: JSON.stringify({ title: noteTitle, note: noteBody })
    });
    setNoteTitle("");
    setNoteBody("");
    await load();
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
        <select value={grade} onChange={(event) => setGrade(event.target.value)}>
          <option value="all">All grades</option>
          <option>Add Immediately</option>
          <option>Consider</option>
          <option>Test Later</option>
          <option>Skip</option>
        </select>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            load().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Search failed"));
          }}
        >
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product name (press Enter)" />
        </form>
        <label className="file-button">
          Import CSV
          <input type="file" accept=".csv,text/csv" onChange={onImport} />
        </label>
        <button type="button" onClick={downloadLaunch}>Download launch list</button>
      </section>

      {status ? <p className="status">{status}</p> : null}

      <section className="stats">
        <article><span>Catalog</span><strong>{metrics?.catalog_size ?? 0}</strong></article>
        <article><span>Add now</span><strong>{metrics?.add_immediately ?? 0}</strong></article>
        <article><span>Consider</span><strong>{metrics?.consider ?? 0}</strong></article>
        <article><span>Niche fits</span><strong>{metrics?.relevant_to_niche ?? 0}</strong></article>
      </section>

      <section className="workspace">
        <div className="panel">
          <h2>Grades</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="grade" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f6e6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Collection</th>
                  <th>Days</th>
                  <th>Margin</th>
                  <th>Score</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
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
                ))}
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No products match these filters. Import a CSV or turn off US only.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel notes">
          <h2>Research notes</h2>
          <form onSubmit={onNote}>
            <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Title" required />
            <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Why this product is in or out" required />
            <button type="submit">Save note</button>
          </form>
          <ul>
            {notes.map((note) => (
              <li key={note._id}>
                <strong>{note.title}</strong>
                <p>{note.note}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
