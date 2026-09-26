import { parse } from 'csv-parse/sync';
import { mapWorkspaceExport, getRecordValue, toNumber } from '../../../shared/productPipeline.js';

const WAREHOUSE_ALIASES = [
  'Warehouse', 'Warehouse Location', 'Stock Location', 'Ship From', 'Shipping From',
  'From Warehouse', 'Origin', 'Country', 'Dispatch From', 'Warehouse Name'
];

function normalizeWarehouseCode(value) {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '_').replace(/\//g, '_');
  if (!text || text.length > 24) {
    return '';
  }

  if (text === 'US' || text === 'USA' || text === 'UNITED_STATES') return 'US';
  if (text === 'CN' || text === 'CHINA') return 'CN';
  if (text === 'CN_US' || text === 'US_CN' || text === 'CN-US' || text === 'US-CN') return 'CN_US';
  if (text === 'EU' || text === 'DE' || text === 'GERMANY') return 'EU';
  if (text === 'UK' || text === 'GB') return 'UK';
  return '';
}

function scanWarehouseCode(record) {
  const named = normalizeWarehouseCode(getRecordValue(record, WAREHOUSE_ALIASES));
  if (named) {
    return named;
  }

  for (const value of Object.values(record || {})) {
    const code = normalizeWarehouseCode(value);
    if (code) {
      return code;
    }
  }

  return '';
}

function isProductPageUrl(value) {
  const text = String(value || '').toLowerCase();
  return /cjdropshipping\.com\/product\//.test(text) || /\/product\/[^/]+-p-\d+/.test(text);
}

function findCjProductUrl(record) {
  const named = getRecordValue(record, ['Product Link', 'Product URL', 'Product Url', 'URL']);
  if (isProductPageUrl(named)) {
    return named.split('?')[0].toLowerCase().replace(/\/$/, '');
  }

  for (const value of Object.values(record || {})) {
    if (isProductPageUrl(value)) {
      return String(value).split('?')[0].toLowerCase().replace(/\/$/, '');
    }
  }

  return '';
}

function normalizeProductName(record) {
  return getRecordValue(record, ['Products Name', 'Product Name', 'Title'])
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findSpu(record) {
  const named = getRecordValue(record, ['SPU', 'Spuid', 'Product ID']);
  if (named && !/\s/.test(named) && named.length >= 6) {
    return named.trim().toLowerCase();
  }

  const sku = getRecordValue(record, ['SKU', 'Product Item #', 'Variant SKU']);
  const match = String(sku || '').trim().match(/^([A-Z0-9]{8,16})/i);
  return match ? match[1].toLowerCase() : '';
}

function productGroupKey(record) {
  const spu = findSpu(record);
  if (spu) {
    return `spu:${spu}`;
  }

  const url = findCjProductUrl(record);
  if (url) {
    return `url:${url}`;
  }

  const name = normalizeProductName(record);
  if (name) {
    return `name:${name}`;
  }

  return '';
}

function warehouseRank(code) {
  if (code === 'US') return 0;
  if (code === 'CN_US') return 1;
  if (code === 'EU' || code === 'UK') return 2;
  if (code === 'CN') return 3;
  return 4;
}

function stockFromRecord(record) {
  const named = getRecordValue(record, ['Inventory', 'Stock', 'Quantity', 'Available', 'Sellable']);
  if (named) {
    return toNumber(named, 0);
  }

  const numbers = Object.values(record || {})
    .map((value) => toNumber(value, NaN))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 10000000);

  return numbers.length ? Math.max(...numbers) : 0;
}

function pickPreferredWarehouseRow(rows) {
  const ranked = [...rows].sort((left, right) => {
    const rankGap = warehouseRank(scanWarehouseCode(left)) - warehouseRank(scanWarehouseCode(right));
    if (rankGap !== 0) {
      return rankGap;
    }

    return stockFromRecord(right) - stockFromRecord(left);
  });

  const winner = { ...ranked[0] };
  const codes = [...new Set(rows.map((row) => scanWarehouseCode(row)).filter(Boolean))];
  const chosen = scanWarehouseCode(winner) || codes[0] || '';
  winner.Warehouse = chosen;
  winner['Ship From'] = chosen;
  winner.Country = chosen;
  winner.__warehouse_options = codes.join(', ');
  winner.__variant_row_count = rows.reduce((sum, row) => sum + (Number(row.__variant_row_count) || 1), 0);
  return winner;
}

function collapseByKey(records, keyFn) {
  const groups = new Map();

  for (const record of records) {
    const key = keyFn(record);
    if (!key) {
      continue;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(record);
  }

  return [...groups.values()].map(pickPreferredWarehouseRow);
}

export function collapseWarehouseRows(records) {
  const byProductLink = collapseByKey(records, productGroupKey);
  return collapseByKey(byProductLink, (record) => normalizeProductName(record) || productGroupKey(record));
}

function firstRecordValue(record, aliases) {
  for (const alias of aliases) {
    const value = getRecordValue(record, [alias]);
    if (value) {
      return value;
    }
  }
  return '';
}

function toWorkspaceRecord(record, index) {
  const productName = firstRecordValue(record, ['Products Name', 'Product Name', 'Title']) || `Imported product ${index + 1}`;
  const cost = firstRecordValue(record, [
    'Wholesale Price',
    'SKU Unit Price After Discount ($)',
    'SKU Unit Price Original Price ($)',
    'Product Unit Price After Discount ($)',
    'Product Original Price ($)',
    'Cost',
    'Supplier Cost'
  ]);
  const warehouse = scanWarehouseCode(record) || getRecordValue(record, WAREHOUSE_ALIASES);

  return {
    'Product Item #': firstRecordValue(record, ['SPU', 'SKU', 'Product Item #', 'Handle', 'Variant SKU']) || `IMP-${index + 1}`,
    'UPC Code': getRecordValue(record, ['UPC Code', 'UPC', 'Barcode']),
    'Product Name': productName,
    'Category': getRecordValue(record, ['Category', 'Product Category', 'Type']) || 'Uncategorized',
    'Subcategory': getRecordValue(record, ['Subcategory']) || 'General',
    'Wholesale Price': cost || '0',
    'Min Quantity': getRecordValue(record, ['Min Quantity']) || '1',
    'Case Pack Quantity': getRecordValue(record, ['Case Pack Quantity']) || '1',
    'Per Piece Weight': getRecordValue(record, ['Per Piece Weight', 'Weight']) || '0.4',
    'Image Src': firstRecordValue(record, ['Product Image', 'Image Src', 'Image URL', 'Main Image', 'SKU Image']),
    Warehouse: warehouse,
    'Ship From': warehouse,
    'Shipping Time': getRecordValue(record, ['Shipping Time', 'Delivery Time', 'Delivery Days', 'Processing Time', 'Lead Time', 'Transit Time', 'Estimated Delivery']),
    Country: warehouse,
    __warehouse_options: record.__warehouse_options || warehouse,
    __variant_row_count: record.__variant_row_count || 1
  };
}

export function parseCsvCatalog(csvText) {
  const records = parse(csvText.replace(/^\uFEFF/, ''), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true
  });
  const collapsed = collapseWarehouseRows(records);

  const products = collapsed.map((record, index) => {
    const product = mapWorkspaceExport(toWorkspaceRecord(record, index), index);
    product.warehouse_options = record.__warehouse_options || product.warehouse;
    product.variant_row_count = record.__variant_row_count || 1;
    product.spu = findSpu(record);
    return product;
  });

  return collapseMappedProducts(products);
}

function collapseMappedProducts(products) {
  const groups = new Map();

  for (const product of products) {
    const nameKey = String(product.name || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const key = product.spu ? `spu:${product.spu}` : (nameKey ? `name:${nameKey}` : `id:${product.product_id}`);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(product);
  }

  return [...groups.values()].map((rows, index) => {
    const ranked = [...rows].sort((left, right) => {
      const leftUs = left.us_based === 'Y' ? 0 : 1;
      const rightUs = right.us_based === 'Y' ? 0 : 1;
      if (leftUs !== rightUs) {
        return leftUs - rightUs;
      }
      return (right.overall_score || 0) - (left.overall_score || 0);
    });
    const winner = { ...ranked[0], product_id: index + 1 };
    winner.variant_row_count = rows.reduce((sum, row) => sum + (Number(row.variant_row_count) || 1), 0);
    return winner;
  });
}

export function importCsvCatalog(csvText) {
  const rawCount = parse(csvText.replace(/^\uFEFF/, ''), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true
  }).length;
  const products = parseCsvCatalog(csvText);
  const usCount = products.filter((product) => product.us_based === 'Y').length;

  return {
    products,
    total: products.length,
    raw_row_count: rawCount,
    collapsed_row_count: Math.max(0, rawCount - products.length),
    us_warehouse_count: usCount,
    non_us_count: products.length - usCount
  };
}
