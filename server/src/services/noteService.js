import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { hasDatabase, query } from '../db/pool.js';

function ensureLocalNotesFile() {
  const dirPath = path.dirname(config.localResearchNotesPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  if (!fs.existsSync(config.localResearchNotesPath)) {
    fs.writeFileSync(config.localResearchNotesPath, '[]');
  }
}

function readLocalNotes() {
  ensureLocalNotesFile();
  return JSON.parse(fs.readFileSync(config.localResearchNotesPath, 'utf8'));
}

function writeLocalNotes(notes) {
  ensureLocalNotesFile();
  fs.writeFileSync(config.localResearchNotesPath, JSON.stringify(notes, null, 2));
}

export async function listResearchNotes() {
  if (hasDatabase()) {
    const result = await query(
      `
        SELECT id, product_id, product_name, title, note, priority, tags, source, created_at, updated_at
        FROM research_notes
        ORDER BY created_at DESC
        LIMIT 100
      `
    );

    return result.rows.map((row) => ({
      ...row,
      tags: row.tags ?? []
    }));
  }

  return readLocalNotes();
}

export async function createResearchNote(payload) {
  const title = String(payload?.title ?? '').trim();
  const note = String(payload?.note ?? '').trim();
  const productName = String(payload?.product_name ?? '').trim();
  const priority = String(payload?.priority ?? 'medium').trim().toLowerCase() || 'medium';
  const tags = Array.isArray(payload?.tags)
    ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(payload?.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

  if (!title || !note) {
    throw new Error('Title and note are required.');
  }

  if (hasDatabase()) {
    const result = await query(
      `
        INSERT INTO research_notes (product_name, title, note, priority, tags, source, updated_at)
        VALUES ($1, $2, $3, $4, $5::text[], $6, NOW())
        RETURNING id, product_id, product_name, title, note, priority, tags, source, created_at, updated_at
      `,
      [productName || null, title, note, priority, tags, 'dashboard']
    );

    return result.rows[0];
  }

  const notes = readLocalNotes();
  const createdAt = new Date().toISOString();
  const createdNote = {
    id: Date.now(),
    product_id: null,
    product_name: productName || null,
    title,
    note,
    priority,
    tags,
    source: 'dashboard-local',
    created_at: createdAt,
    updated_at: createdAt
  };

  notes.unshift(createdNote);
  writeLocalNotes(notes);
  return createdNote;
}