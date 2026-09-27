import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const serverRoot = path.resolve(__dirname, '..');
export const appRoot = path.resolve(serverRoot, '..');
export const workspaceRoot = path.resolve(appRoot, '../../..');

export const config = {
  port: Number.parseInt(process.env.PORT ?? '8000', 10),
  dataSource: process.env.DATA_SOURCE ?? (process.env.DATABASE_URL ? 'postgres' : 'workspace-export'),
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  syncOnStartup: process.env.SYNC_ON_STARTUP !== 'false',
  workspaceExportCsv: path.resolve(workspaceRoot, 'CSV File', 'export_product_feed.csv'),
  sampleProductsCsv: path.resolve(appRoot, 'data', 'sample_products.csv'),
  supplierCsv: path.resolve(appRoot, 'data', 'supplier_data.csv'),
  localResearchNotesPath: path.resolve(appRoot, 'data', 'research-notes.local.json')
};