import { initializeDatabase } from '../db/schema.js';
import { hasDatabase } from '../db/pool.js';

if (!hasDatabase()) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

await initializeDatabase();
console.log('Database schema initialized.');