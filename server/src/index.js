import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializePersistence, seedDatabase } from './db/bootstrap.js';
import {
  getAnalytics,
  getLaunchCatalog,
  getProductById,
  getProducts,
  getSuppliers,
  searchProducts
} from './services/dataService.js';
import {
  analyzeSuppliers,
  calculateProfitMargin,
  getKeywords,
  researchProducts,
  scoreOpportunities
} from './services/researchService.js';
import { createResearchNote, listResearchNotes } from './services/noteService.js';
import { setSessionCatalog } from './services/dataService.js';
import { importCsvCatalog } from './services/importService.js';

const app = express();
const persistenceState = await initializePersistence();

app.use(cors());
app.use(express.json({ limit: '80mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', backend: 'node', data_source: config.dataSource, persistence: persistenceState.mode });
});

app.get('/api/products', async (req, res, next) => {
  try {
    const skip = Number.parseInt(req.query.skip ?? '0', 10);
    const limit = Number.parseInt(req.query.limit ?? '20', 10);
    res.json(await getProducts({ skip, limit }));
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:productId', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/search/', async (req, res, next) => {
  try {
    const queryText = String(req.query.q ?? '').trim();
    const results = await searchProducts(queryText);
    res.json({ query: queryText, results, count: results.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/suppliers', async (_req, res, next) => {
  try {
    res.json(await getSuppliers());
  } catch (error) {
    next(error);
  }
});

app.get('/api/analytics', async (_req, res, next) => {
  try {
    res.json(await getAnalytics());
  } catch (error) {
    next(error);
  }
});

app.get('/api/research-notes', async (_req, res, next) => {
  try {
    res.json({ notes: await listResearchNotes() });
  } catch (error) {
    next(error);
  }
});

app.post('/api/research-notes', async (req, res, next) => {
  try {
    const note = await createResearchNote(req.body ?? {});
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/sync-workspace', async (_req, res, next) => {
  try {
    res.json(await seedDatabase());
  } catch (error) {
    next(error);
  }
});

app.post('/api/imports/catalog', async (req, res, next) => {
  try {
    const csvText = String(req.body?.csvText ?? req.body?.csv ?? '');
    if (!csvText.trim()) {
      res.status(400).json({ error: 'Paste or upload a CSV export from CJ / TopDawg first.' });
      return;
    }

    const imported = importCsvCatalog(csvText);
    setSessionCatalog(imported.products);
    res.json({
      ...imported,
      message: 'Catalog loaded privately in the dashboard. Nothing was sent to Shopify.'
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/imports/clear', (_req, res) => {
  setSessionCatalog(null);
  res.json({ cleared: true });
});

app.get('/api/launch-catalog', async (_req, res, next) => {
  try {
    const products = await getLaunchCatalog();
    res.json({ products, total: products.length, target: 30 });
  } catch (error) {
    next(error);
  }
});

app.post('/api/agent/research', async (req, res, next) => {
  try {
    res.json(await researchProducts(req.body?.query ?? 'product research'));
  } catch (error) {
    next(error);
  }
});

app.post('/api/agent/suppliers', async (req, res, next) => {
  try {
    res.json(await analyzeSuppliers(req.body?.category ?? 'General'));
  } catch (error) {
    next(error);
  }
});

app.post('/api/agent/profit', (req, res) => {
  res.json(calculateProfitMargin(
    req.body?.product_name ?? 'Product',
    req.body?.cost ?? 0,
    req.body?.market_price ?? 0,
    req.body?.shipping ?? 0,
    req.body?.advertising ?? 0
  ));
});

app.post('/api/agent/keywords', (req, res) => {
  res.json(getKeywords(req.body?.product_name ?? 'Product', req.body?.category ?? 'General'));
});

app.post('/api/agent/opportunities', async (_req, res, next) => {
  try {
    res.json(await scoreOpportunities());
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Unexpected server error' });
});

app.listen(config.port, () => {
  console.log(`Node dashboard backend listening on http://localhost:${config.port}`);
});