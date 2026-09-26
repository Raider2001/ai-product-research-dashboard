import fs from 'node:fs/promises';
import path from 'node:path';
import { serverRoot } from '../config.js';
import { hasDatabase, query } from './pool.js';

let initialized = false;

export async function initializeDatabase() {
  if (!hasDatabase() || initialized) {
    return false;
  }

  const schemaPath = path.resolve(serverRoot, 'db', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  await query(sql);
  initialized = true;
  return true;
}