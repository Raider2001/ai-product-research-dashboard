import { hasDatabase } from '../db/pool.js';
import { seedDatabase } from '../db/bootstrap.js';

if (!hasDatabase()) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

const result = await seedDatabase();
console.log(`Seeded ${result.products} products and ${result.suppliers} suppliers.`);