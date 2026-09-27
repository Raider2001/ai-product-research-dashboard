import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool;

export function hasDatabase() {
  return Boolean(config.databaseUrl);
}

export function getPool() {
  if (!hasDatabase()) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

export async function query(text, params = []) {
  const db = getPool();
  if (!db) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return db.query(text, params);
}