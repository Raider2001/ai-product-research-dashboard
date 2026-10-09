import { FormEvent, useState } from "react";
import type { Note } from "../types";

type NotesPanelProps = {
  notes: Note[];
  onCreate: (title: string, note: string) => Promise<void>;
};

// Research notes sidebar. The form fields are component-local state because no
// other part of the app needs them; the saved list comes down as a prop.
export default function NotesPanel({ notes, onCreate }: NotesPanelProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await onCreate(title, body);
      setTitle("");
      setBody("");
    } catch {
      // The page shows the error status; keep the draft so nothing is lost.
    }
  }

  return (
    <aside className="panel notes">
      <h2>Research notes</h2>
      <form onSubmit={onSubmit}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" aria-label="Note title" required />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Why this product is in or out" aria-label="Note details" required />
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
  );
}
