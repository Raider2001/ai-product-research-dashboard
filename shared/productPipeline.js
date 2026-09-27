export const SHORTLIST_THRESHOLDS = {
  minMarketScore: 68,
  minEstimatedMargin: 40,
  preferredEstimatedMargin: 50,
  maxShippingCost: 12,
  minCompetitorGap: 1.05,
  minOverallScore: 80,
  minFitScore: 3
};

export const SHOPIFY_FEE_RATE = 0.029;
export const SHOPIFY_FEE_FIXED = 0.3;

export const SCORE_WEIGHTS = {
  fit: 0.3,
  profit: 0.3,
  shipping: 0.2,
  competition: 0.1,
  quality: 0.1
};

export const LAUNCH_TARGET_PER_COLLECTION = 10;
export const LAUNCH_OVERFLOW_MAX = 8;

export const NICHE_COLLECTIONS = [
  {
    id: 'home_organization',
    name: 'Home Organization',
    keywords: [
      'drawer organizer', 'drawer organis', 'cable management', 'cable box', 'closet',
      'storage bin', 'storage basket', 'underbed', 'under-bed', 'shelf organizer',
      'cubby', 'hanger', 'over the door', 'over-the-door', 'vacuum bag', 'storage cube',
      'laundry sorter', 'shoe rack', 'jewelry organizer', 'makeup organizer', 'entryway'
    ]
  },
  {
    id: 'desk_office',
    name: 'Desk & Office',
    keywords: [
      'desk organizer', 'desk organis', 'monitor stand', 'monitor riser', 'notebook',
      'pen holder', 'file organizer', 'desk tray', 'laptop stand', 'office organizer',
      'stationery', 'paper tray', 'drawer unit desk', 'cable clip', 'desk shelf',
      'keyboard tray', 'inbox tray', 'magazine file'
    ]
  },
  {
    id: 'kitchen_organization',
    name: 'Kitchen Organization',
    keywords: [
      'spice rack', 'pantry', 'canister', 'food storage', 'storage container',
      'kitchen organizer', 'kitchen organis', 'dish rack', 'utensil holder',
      'fridge organizer', 'fridge organis', 'jar set', 'lazy susan', 'pot lid',
      'under sink', 'cabinet organizer', 'shelf riser', 'bin pantry', 'oil rack'
    ]
  }
];

const ADJACENT_NICHE_KEYWORDS = [
  'kitchen', 'home', 'decor', 'office', 'desk', 'storage', 'organizer', 'organis',
  'shelf', 'container', 'rack', 'bin', 'basket', 'tumbler', 'mug', 'cup',
  'water bottle', 'coaster', 'lunch box', 'bento', 'cutlery', 'chopping board'
];

const OFF_NICHE_KEYWORDS = [
  'fishing', 'lure', 'dog toy', 'cat toy', 'pet toy', 'bluetooth speaker',
  'car charger', 'car mount', 'garden hose', 'smart watch', 'smartwatch',
  'wristwatch', 'tire', 'stroller', 'gaming headset', 'phone case', 'led strip'
];

const categoryDemandBoost = {
  'school & office supplies': 14,
  kitchen: 13,
  home: 12,
  storage: 14,
  organization: 16,
  'tools & hardware': 4
};

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const normalized = String(value).replace(/[$,]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitDelimitedValues(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/\r?\n|\||;|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function collectImageUrls(record) {
  if (!record || typeof record !== 'object') {
    return [];
  }

  const candidateFields = [
    'Image Src',
    'Image URL',
    'Image',
    'Main Image',
    'Primary Image',
    'Product Image',
    'Photo',
    'Image URLs',
    'Gallery Images',
    'Images'
  ];

  const urls = candidateFields.flatMap((field) => splitDelimitedValues(record[field]));
  return [...new Set(urls)];
}

export function collectEmbeddedImages(record) {
  if (!record || typeof record !== 'object') {
    return [];
  }

  return Array.isArray(record['__embeddedImages']) ? record['__embeddedImages'] : [];
}

export function pickImageAltText(record, fallbackText = '') {
  if (!record || typeof record !== 'object') {
    return fallbackText;
  }

  const candidateFields = [
    'Image Alt Text',
    'Alt Text',
    'Image Description',
    'Description'
  ];

  for (const field of candidateFields) {
    const value = String(record[field] ?? '').trim();
    if (value) {
      return value;
    }
  }

  return fallbackText;
}

export function getRecordValue(record, aliases) {
  if (!record || typeof record !== 'object') {
    return '';
  }

  const normalizedAliases = aliases.map((alias) => String(alias).trim().toLowerCase());
  const entries = Object.entries(record);

  for (const [key, value] of entries) {
    if (normalizedAliases.includes(String(key).trim().toLowerCase()) && value !== '' && value != null) {
      return String(value).trim();
    }
  }

  for (const [key, value] of entries) {
    const lowered = String(key).trim().toLowerCase();
    if (normalizedAliases.some((alias) => alias.length >= 4 && lowered.includes(alias)) && value !== '' && value != null) {
      return String(value).trim();
    }
  }

  return '';
}

export function parseDeliveryWindow(value) {
  const text = String(value || '').toLowerCase().replace(/to/g, '-').replace(/~/g, '-').replace(/–|—/g, '-');
  const numbers = text.match(/\d+(\.\d+)?/g)?.map((part) => Number.parseFloat(part)).filter((number) => Number.isFinite(number) && number > 0) || [];

  if (numbers.length === 0) {
    return null;
  }

  const min = Math.round(Math.min(...numbers));
  const max = Math.round(Math.max(...numbers));
  return {
    min_days: min,
    max_days: max,
    typical_days: max,
    label: min === max ? `${max} days` : `${min}-${max} days`
  };
}

function originBlob(product = {}) {
  return [
    product.warehouse,
    product.ship_from,
    product.shipping_origin,
    product.supplier_region,
    product.region,
    product.us_based
  ].filter(Boolean).join(' ').toLowerCase();
}

export function hasUsWarehouse(product) {
  const text = originBlob(product);
  if (!text) {
    return false;
  }

  if (/\b(australia|austria|belarus|cyprus|russia)\b/.test(text)) {
    return /\b(usa|u\.s\.a?|united states|\bus\b|california|new jersey|\bnj\b|\bca warehouse|us warehouse|us stock)\b/.test(text);
  }

  return /\b(usa|u\.s\.a?|united states|\bus\b|cn[_/-]?us|us[_/-]?cn|california|new jersey|new york|texas|ohio|us warehouse|us stock|american warehouse)\b/.test(text);
}

export function inferDeliveryDaysFromOrigin(product) {
  const text = originBlob(product);
  if (hasUsWarehouse(product) && !/\b(china|cn|yiwu|shenzhen|guangzhou)\b/.test(text)) {
    return { typical_days: 5, label: '2-5 days', reason: 'US warehouse typical window.' };
  }

  if (hasUsWarehouse(product)) {
    return { typical_days: 5, label: '2-5 days if US stock is used', reason: 'US warehouse available; confirm that variant actually ships from the US.' };
  }

  if (/\b(germany|eu warehouse|europe|uk warehouse)\b/.test(text)) {
    return { typical_days: 8, label: '5-10 days', reason: 'EU warehouse to US is slower than local US stock.' };
  }

  if (/\b(china|cn|yiwu|shenzhen|guangzhou)\b/.test(text)) {
    return { typical_days: 14, label: '10-14+ days', reason: 'China-origin shipping. Score this honestly before listing.' };
  }

  return { typical_days: 0, label: '', reason: '' };
}

export function resolveShippingProfile(product) {
  const originText = getRecordValue(product, [
    'warehouse', 'Warehouse', 'Warehouse Location', 'Stock Location', 'Ship From',
    'Shipping From', 'From Warehouse', 'Origin', 'Country', 'Dispatch From', 'ship_from',
    'shipping_origin', 'supplier_region', 'region'
  ]) || originBlob(product);

  const window = parseDeliveryWindow(
    product.delivery_days_label
    || product.shipping_time
    || product.delivery_time
    || getRecordValue(product, [
      'Shipping Time', 'Delivery Time', 'Delivery Days', 'Processing Time',
      'Lead Time', 'Transit Time', 'Estimated Delivery', 'shipping_time',
      'delivery_days', 'lead_time', 'lead_time_days'
    ])
  );

  const inferred = inferDeliveryDaysFromOrigin({ ...product, warehouse: originText, ship_from: originText });
  const usBased = hasUsWarehouse({ ...product, warehouse: originText, ship_from: originText }) ? 'Y' : 'N';
  const typicalDays = window?.typical_days || inferred.typical_days || 0;
  const label = window?.label || inferred.label || (typicalDays ? `${typicalDays} days` : 'Unknown');

  return {
    warehouse: originText || product.warehouse || '',
    ship_from: originText || product.ship_from || '',
    us_based: usBased,
    delivery_days: typicalDays,
    delivery_days_min: window?.min_days || typicalDays,
    delivery_days_max: window?.max_days || typicalDays,
    delivery_days_label: label,
    shipping_origin_note: inferred.reason
  };
}

export function normalizeCategoryName(value) {
  if (!value) {
    return 'Uncategorized';
  }

  return String(value).split('|')[0].trim();
}

export function normalizeSubcategoryName(value) {
  if (!value) {
    return 'General';
  }

  return String(value).split('|')[0].trim();
}

export function estimateRetailPrice(category, supplierCost, shippingCost = 0) {
  const lowerCategory = category.toLowerCase();
  const markup = /organiz|storage|desk|office|kitchen|home/.test(lowerCategory) ? 2.65
    : lowerCategory.includes('tools') ? 2.1
    : 2.5;

  const markupPrice = supplierCost * markup;
  const shippingAwareFloor = (supplierCost + shippingCost) / 0.5;
  const categoryFloor = /organiz|storage|desk|office|kitchen/.test(lowerCategory) ? 19.99
    : 14.99;

  return Number((Math.max(markupPrice, shippingAwareFloor, categoryFloor)).toFixed(2));
}

export function estimateShippingCost(perPieceWeight, category, casePackQuantity) {
  const lowerCategory = category.toLowerCase();
  const weight = Math.max(perPieceWeight, 0);
  const base = 3.15 + (weight * 1.9);
  const categoryAdjustment = lowerCategory.includes('tools') ? 1.9
    : lowerCategory.includes('office') ? 0.65
    : lowerCategory.includes('care') || lowerCategory.includes('cosmetic') ? 0.45
    : 1.1;
  const packAdjustment = casePackQuantity >= 144 ? -0.5 : casePackQuantity >= 72 ? -0.2 : 0;

  return Number(clamp(base + categoryAdjustment + packAdjustment, 2.75, 18).toFixed(2));
}

export function estimateCompetition(category, minQuantity) {
  const lowerCategory = category.toLowerCase();
  const organizer = /organiz|storage|desk|kitchen|office|home/.test(lowerCategory);
  const base = organizer ? 61 : 68;
  const quantityPenalty = minQuantity >= 48 ? 8 : minQuantity >= 24 ? 4 : 0;

  return clamp(base + quantityPenalty, 20, 95);
}

export function estimateMarketScore(category, subcategory, supplierCost, minQuantity) {
  const lowerCategory = category.toLowerCase();
  const lowerSubcategory = subcategory.toLowerCase();
  const blob = `${lowerCategory} ${lowerSubcategory}`;
  const demandBoost = categoryDemandBoost[lowerCategory] ?? 8;
  const organizerBoost = /organiz|storage|rack|bin|drawer|desk|pantry|spice|cable|closet/.test(blob) ? 14 : 0;
  const closeoutPenalty = lowerCategory.includes('specials') || lowerSubcategory.includes('closeout') ? 14 : 0;
  const priceFitBoost = supplierCost <= 1.5 ? 8 : supplierCost <= 3 ? 10 : supplierCost <= 8 ? 8 : 4;
  const quantityPenalty = minQuantity >= 48 ? 8 : minQuantity >= 24 ? 4 : 0;

  return clamp(40 + demandBoost + organizerBoost + priceFitBoost - closeoutPenalty - quantityPenalty, 35, 96);
}

export function estimateCompetitorPrice(productPrice, marketScore, category) {
  const lowerCategory = category.toLowerCase();
  const scoreMultiplier = marketScore >= 85 ? 1.24 : marketScore >= 70 ? 1.18 : 1.11;
  const categoryMultiplier = lowerCategory.includes('care') || lowerCategory.includes('cosmetic') ? 1.04
    : lowerCategory.includes('tools') ? 1.01
    : 1.02;

  return Number((productPrice * scoreMultiplier * categoryMultiplier).toFixed(2));
}

export function calculateShopifyFees(sellingPrice) {
  const price = Math.max(toNumber(sellingPrice), 0);
  return Number(((price * SHOPIFY_FEE_RATE) + SHOPIFY_FEE_FIXED).toFixed(2));
}

export function calculateUnitEconomics(sellingPrice, supplierCost, shippingCost, advertisingCost = 0) {
  const price = Math.max(toNumber(sellingPrice), 0);
  const cost = Math.max(toNumber(supplierCost), 0);
  const shipping = Math.max(toNumber(shippingCost), 0);
  const ads = Math.max(toNumber(advertisingCost), 0);
  const shopifyFees = calculateShopifyFees(price);
  const profit = Number((price - cost - shipping - shopifyFees - ads).toFixed(2));
  const margin = price > 0 ? Number(((profit / price) * 100).toFixed(1)) : 0;

  return {
    shopify_fees: shopifyFees,
    advertising_cost: ads,
    profit_dollars: profit,
    estimated_margin: margin
  };
}

export function calculateEstimatedMargin(productPrice, supplierCost, shippingCost, advertisingCost = 0) {
  return calculateUnitEconomics(productPrice, supplierCost, shippingCost, advertisingCost).estimated_margin;
}

function textBlob(product) {
  return [
    product.name,
    product.category,
    product.subcategory,
    product.collection
  ].filter(Boolean).join(' ').toLowerCase();
}

function keywordHits(text, keywords) {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

export function scoreNicheFit(product) {
  const text = textBlob(product);

  if (OFF_NICHE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return {
      collection: 'Out of niche',
      collection_id: 'out_of_niche',
      fit_score: 1,
      fit_reason: 'Does not serve the home / desk / kitchen organization customer.'
    };
  }

  let best = { collection: 'Out of niche', collection_id: 'out_of_niche', hits: 0 };
  for (const collection of NICHE_COLLECTIONS) {
    const hits = keywordHits(text, collection.keywords);
    if (hits > best.hits) {
      best = { collection: collection.name, collection_id: collection.id, hits };
    }
  }

  if (best.hits >= 1) {
    return {
      collection: best.collection,
      collection_id: best.collection_id,
      fit_score: 5,
      fit_reason: `Perfect fit for ${best.collection}.`
    };
  }

  if (ADJACENT_NICHE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return {
      collection: 'Adjacent (review)',
      collection_id: 'adjacent',
      fit_score: 3,
      fit_reason: 'Somewhat related to home, kitchen, or desk — confirm it is an organizer, not a random household SKU.'
    };
  }

  return {
    collection: 'Out of niche',
    collection_id: 'out_of_niche',
    fit_score: 1,
    fit_reason: 'Random catalog item. Skip for a curated organization store.'
  };
}

export function scoreProfitBand(marginPercent) {
  if (marginPercent >= 50) return 5;
  if (marginPercent >= 40) return 4;
  if (marginPercent >= 30) return 3;
  if (marginPercent >= 20) return 2;
  return 1;
}

export function estimateDeliveryDays(product) {
  const profile = resolveShippingProfile(product);
  if (profile.delivery_days > 0) {
    return profile.delivery_days;
  }

  const explicit = toNumber(product.delivery_days ?? product.lead_time ?? product.lead_time_days, 0);
  if (explicit > 0) {
    return explicit;
  }

  const shipping = toNumber(product.shipping_cost);
  if (shipping <= 4.5) return 5;
  if (shipping <= 7) return 8;
  if (shipping <= 11) return 12;
  return 16;
}

export function scoreShippingSpeed(deliveryDays) {
  if (deliveryDays <= 5) return 5;
  if (deliveryDays <= 7) return 4;
  if (deliveryDays <= 10) return 3;
  if (deliveryDays <= 14) return 2;
  return 1;
}

export function scoreProductQuality(product) {
  const imageUrls = Array.isArray(product.image_urls) ? product.image_urls : [];
  const embedded = Array.isArray(product.embedded_images) ? product.embedded_images : [];
  const imageCount = imageUrls.length + embedded.length;
  const hasDescription = String(product.description || product.image_alt_text || '').trim().length > 40;
  let score = 1;

  if (imageCount >= 1) score = 3;
  if (imageCount >= 2) score = 4;
  if (imageCount >= 3 && hasDescription) score = 5;
  if (imageCount === 0) score = 1;

  return {
    quality_score: score,
    quality_reason: imageCount === 0
      ? 'No usable photos. Treat as a red flag until the supplier provides images.'
      : `${imageCount} image source(s)${hasDescription ? ' and a usable description' : ''}.`
  };
}

export function scoreCompetition(product) {
  const ourPrice = toNumber(product.product_price ?? product.price);
  const competitor = toNumber(product.competitor_price);

  if (competitor <= 0 || ourPrice <= 0) {
    return {
      competition_score_band: 3,
      competition_reason: 'No Amazon/Walmart price on file. Search the product name on both sites before listing.'
    };
  }

  const ratio = ourPrice / competitor;
  if (ratio <= 0.9) {
    return { competition_score_band: 5, competition_reason: 'You can price under typical marketplace comps and still look competitive.' };
  }
  if (ratio <= 1.1) {
    return { competition_score_band: 4, competition_reason: 'Close to marketplace pricing. Compete with better photos and copy, not a race to $9.99.' };
  }
  if (ratio <= 1.25) {
    return { competition_score_band: 3, competition_reason: 'Slightly above comps. Only keep if quality and bundling justify it.' };
  }
  if (ratio <= 1.5) {
    return { competition_score_band: 2, competition_reason: 'You need a much higher price than common marketplace listings. Hard to win.' };
  }

  return {
    competition_score_band: 1,
    competition_reason: 'Amazon/Walmart-style pricing would undercut you badly. Skip.'
  };
}

function scaleFiveToHundred(score) {
  return clamp(score * 20, 0, 100);
}

export function gradeFromOverallScore(overallScore) {
  if (overallScore >= 90) return 'Add Immediately';
  if (overallScore >= 80) return 'Consider';
  if (overallScore >= 70) return 'Test Later';
  return 'Skip';
}

export function enrichCatalogScoring(product) {
  const sellingPrice = toNumber(product.product_price ?? product.price);
  const economics = calculateUnitEconomics(
    sellingPrice,
    product.supplier_cost,
    product.shipping_cost,
    product.advertising_cost
  );
  const fit = scoreNicheFit(product);
  const profitScore = scoreProfitBand(economics.estimated_margin);
  const shippingProfile = resolveShippingProfile(product);
  Object.assign(product, shippingProfile);
  const deliveryDays = estimateDeliveryDays(product);
  const shippingScore = scoreShippingSpeed(deliveryDays);
  const quality = scoreProductQuality(product);
  const competition = scoreCompetition({ ...product, product_price: sellingPrice });

  const commerceScore = clamp(
    Math.round(
      (scaleFiveToHundred(profitScore) * 0.4)
      + (scaleFiveToHundred(shippingScore) * 0.3)
      + (scaleFiveToHundred(competition.competition_score_band) * 0.15)
      + (scaleFiveToHundred(quality.quality_score) * 0.15)
    ),
    0,
    100
  );
  const storeScore = clamp(
    Math.round(
      (scaleFiveToHundred(fit.fit_score) * SCORE_WEIGHTS.fit)
      + (scaleFiveToHundred(profitScore) * SCORE_WEIGHTS.profit)
      + (scaleFiveToHundred(shippingScore) * SCORE_WEIGHTS.shipping)
      + (scaleFiveToHundred(competition.competition_score_band) * SCORE_WEIGHTS.competition)
      + (scaleFiveToHundred(quality.quality_score) * SCORE_WEIGHTS.quality)
    ),
    0,
    100
  );
  const commerceGrade = gradeFromOverallScore(commerceScore);

  product.collection = fit.collection;
  product.collection_id = fit.collection_id;
  product.fit_score = fit.fit_score;
  product.fit_reason = fit.fit_reason;
  product.shopify_fees = economics.shopify_fees;
  product.advertising_cost = economics.advertising_cost;
  product.profit_dollars = economics.profit_dollars;
  product.estimated_margin = economics.estimated_margin;
  product.profit_score = profitScore;
  product.delivery_days = deliveryDays;
  product.shipping_score = shippingScore;
  product.quality_score = quality.quality_score;
  product.quality_reason = quality.quality_reason;
  product.competition_grade = competition.competition_score_band;
  product.competition_reason = competition.competition_reason;
  product.commerce_score = commerceScore;
  product.commerce_grade = commerceGrade;
  product.store_score = storeScore;
  product.overall_score = commerceScore;
  product.grade = commerceGrade;
  product.supplier_name = product.supplier_name || product.supplier || 'Unknown';
  product.opportunity_score = commerceScore;
  product.amazon_search_url = `https://www.google.com/search?q=${encodeURIComponent(`${product.name} site:amazon.com`)}`;
  product.walmart_search_url = `https://www.google.com/search?q=${encodeURIComponent(`${product.name} site:walmart.com`)}`;
  product.shortlist_ready = isShortlistReady(product);
  product.shortlist_reason = buildShortlistReason(product);
  product.consumer_behavior_note = buildConsumerBehaviorNote(product);
  Object.assign(product, buildPricingRecommendation(product));
  Object.assign(product, buildListingDecision(product));

  return product;
}

export function buildCatalogMetrics(products = []) {
  const list = Array.isArray(products) ? products : [];
  const inNiche = list.filter((product) => product.fit_score === 5);
  const highQuality = list.filter((product) => (product.overall_score ?? 0) >= 80 && product.fit_score >= 3);

  const byCollection = NICHE_COLLECTIONS.map((collection) => {
    const members = list.filter((product) => product.collection_id === collection.id);
    const launchReady = members
      .filter((product) => ['Add Immediately', 'Consider'].includes(product.grade))
      .sort((left, right) => (right.overall_score ?? 0) - (left.overall_score ?? 0));

    return {
      collection: collection.name,
      collection_id: collection.id,
      relevant: members.length,
      high_quality: members.filter((product) => (product.overall_score ?? 0) >= 80).length,
      launch_filled: Math.min(LAUNCH_TARGET_PER_COLLECTION, launchReady.length),
      launch_target: LAUNCH_TARGET_PER_COLLECTION
    };
  });

  return {
    catalog_size: list.length,
    relevant_to_niche: inNiche.length,
    high_quality: highQuality.length,
    add_immediately: list.filter((product) => product.grade === 'Add Immediately').length,
    consider: list.filter((product) => product.grade === 'Consider').length,
    test_later: list.filter((product) => product.grade === 'Test Later').length,
    skip: list.filter((product) => product.grade === 'Skip').length,
    launch_target_total: (LAUNCH_TARGET_PER_COLLECTION * NICHE_COLLECTIONS.length) + LAUNCH_OVERFLOW_MAX,
    by_collection: byCollection
  };
}

function listingRank(product) {
  const rank = { List: 0, Extra: 1, 'Maybe later': 2, 'Do not list': 9 };
  return rank[product.listing_verdict] ?? 8;
}

export function pickLaunchCatalog(products = [], perCollection = LAUNCH_TARGET_PER_COLLECTION, options = {}) {
  const usOnly = options.usOnly !== false;
  const overflowMax = options.overflowMax ?? LAUNCH_OVERFLOW_MAX;
  const eligible = (product) => !usOnly || product.us_based === 'Y';
  const byLaunchOrder = (left, right) => {
    const verdictGap = listingRank(left) - listingRank(right);
    if (verdictGap !== 0) return verdictGap;
    return (right.commerce_score ?? right.overall_score ?? 0) - (left.commerce_score ?? left.overall_score ?? 0);
  };

  const core = NICHE_COLLECTIONS.flatMap((collection) => {
    return [...products]
      .filter((product) => product.collection_id === collection.id && eligible(product))
      .filter((product) => product.listing_verdict === 'List' || (product.fit_score === 5 && product.listing_verdict !== 'Do not list'))
      .sort(byLaunchOrder)
      .slice(0, perCollection)
      .map((product) => ({ ...product, launch_slot: 'core' }));
  });

  const taken = new Set(core.map((product) => product.product_id));
  const extras = [...products]
    .filter((product) => eligible(product) && !taken.has(product.product_id) && product.listing_verdict === 'Extra')
    .sort(byLaunchOrder)
    .slice(0, overflowMax)
    .map((product) => ({ ...product, launch_slot: 'extra' }));

  return [...core, ...extras];
}

export function toSelectionSpreadsheetRow(product) {
  return {
    'Product Name': product.name || '',
    Category: product.collection || product.category || '',
    Supplier: product.supplier_name || 'Unknown',
    'US Based (Y/N)': product.us_based || 'N',
    Warehouse: product.warehouse || product.ship_from || '',
    Cost: Number(product.supplier_cost ?? 0).toFixed(2),
    Shipping: Number(product.shipping_cost ?? 0).toFixed(2),
    'Retail Price': Number(product.product_price ?? product.price ?? 0).toFixed(2),
    'Shopify Fees': Number(product.shopify_fees ?? 0).toFixed(2),
    'Profit $': Number(product.profit_dollars ?? 0).toFixed(2),
    'Margin %': Number(product.estimated_margin ?? 0).toFixed(1),
    'Days to Ship': product.delivery_days_label || product.delivery_days || '',
    'Delivery Days': product.delivery_days ?? '',
    'Competition Score': product.competition_grade ?? '',
    'Quality Score': product.quality_score ?? '',
    'Fit Score': product.fit_score ?? '',
    'Overall Score': product.overall_score ?? '',
    Grade: product.grade || product.commerce_grade || '',
    'Store fit score': product.store_score ?? '',
    'List?': product.listing_verdict || '',
    'List reason': product.listing_reason || product.decision_reason || '',
    Notes: [product.fit_reason, product.competition_reason, product.shortlist_reason].filter(Boolean).join(' ')
  };
}

export function buildConsumerBehaviorNote(product) {
  if (product.fit_score === 1) {
    return 'Wrong customer. A fishing lure or car accessory will not convert next to drawer organizers.';
  }

  if (product.fit_score === 5 && product.estimated_margin >= 50 && product.overall_score >= 90) {
    return 'Problem-solver purchase for the same organization shopper. High intent, easy to merchandize with the rest of the catalog.';
  }

  if (product.fit_score === 5 && product.estimated_margin >= 40) {
    return 'Fits the organization niche. Shoppers buy these to fix clutter; pair with 2-3 complementary SKUs on the product page.';
  }

  if (product.fit_score === 3) {
    return 'Adjacent to the niche. Only keep if it clearly belongs in Home, Desk, or Kitchen organization after a manual look.';
  }

  return 'Weak fit or thin economics. Keep in research mode; do not pad the launch catalog with it.';
}

export function buildOpportunityScore(product) {
  if (Number.isFinite(Number(product.overall_score))) {
    return Number(product.overall_score);
  }

  return clamp(
    Math.round(
      (product.market_score * 0.5) +
      ((100 - product.competition_score) * 0.2) +
      (clamp(product.estimated_margin, 0, 100) * 0.2) +
      (clamp(product.competitor_price - product.product_price, 0, 20) * 0.5)
    ),
    25,
    98
  );
}

function getEconomicResilienceScore(category = '') {
  const lowerCategory = category.toLowerCase();
  if (/organiz|storage|desk|office|kitchen|home/.test(lowerCategory)) {
    return 74;
  }

  if (lowerCategory.includes('tool') || lowerCategory.includes('hardware')) {
    return 62;
  }

  return 54;
}

function getDemandStabilityBand(product) {
  const resilience = getEconomicResilienceScore(product.category);
  if (product.market_score >= 80 && resilience >= 70) {
    return 'Stable Demand';
  }

  if (product.market_score >= 62) {
    return 'Moderate Demand';
  }

  return 'Price Sensitive Demand';
}

export function buildPricingRecommendation(product) {
  const supplierCost = clamp(Number(product.supplier_cost ?? 0), 0, 100000);
  const shippingCost = clamp(Number(product.shipping_cost ?? 0), 0, 100000);
  const baselinePrice = clamp(Number(product.product_price ?? product.price ?? 0), 0, 100000);
  const competitorPrice = clamp(Number(product.competitor_price ?? 0), 0, 100000);
  const landedCost = supplierCost + shippingCost;
  const resilience = getEconomicResilienceScore(product.category);

  const economyMultiplier = resilience >= 72 ? 1.03 : resilience >= 58 ? 1.0 : 0.97;
  const demandMultiplier = product.market_score >= 80 ? 1.04 : product.market_score >= 65 ? 1.01 : 0.98;

  const targetFromCost = landedCost / 0.6;
  const marketAnchor = competitorPrice > 0 ? competitorPrice * 0.96 : baselinePrice;
  const recommended = clamp(
    Number((Math.max(targetFromCost, baselinePrice) * economyMultiplier * demandMultiplier).toFixed(2)),
    0,
    marketAnchor > 0 ? marketAnchor : 99999
  );

  const floorPrice = Number((landedCost / 0.65).toFixed(2));
  const ceilingPrice = Number((Math.max(recommended * 1.12, baselinePrice * 1.1)).toFixed(2));
  const testPrice = Number(((recommended + floorPrice) / 2).toFixed(2));

  return {
    demand_outlook: getDemandStabilityBand(product),
    list_price_floor: floorPrice,
    list_price_test: testPrice,
    list_price_recommended: Number(recommended.toFixed(2)),
    list_price_ceiling: ceilingPrice
  };
}

export function buildListingDecision(product) {
  const commerce = product.commerce_score ?? product.overall_score ?? 0;
  const commerceGrade = product.commerce_grade || product.grade || gradeFromOverallScore(commerce);
  const margin = Number(product.estimated_margin ?? 0);
  const fit = Number(product.fit_score ?? 1);
  const us = product.us_based === 'Y';

  let listing_verdict = 'Do not list';
  let listing_reason = product.fit_reason || 'Not a fit for this store.';

  if (!us) {
    listing_reason = `Do not list. Grade is ${commerceGrade} (${commerce}), but there is no US warehouse row — shipping will be too slow for this store.`;
  } else if (margin < 40) {
    listing_reason = `Do not list. Grade is ${commerceGrade} (${commerce}), but margin is ${margin}% after fees (need 40%, prefer 50%+).`;
  } else if (commerce < 70) {
    listing_reason = `Do not list. Numbers score ${commerce} is below 70. Weak profit, shipping, or photos.`;
  } else if (fit <= 1) {
    listing_reason = `Do not list for this store. Numbers look ${commerceGrade} (${commerce}), but it is off-niche for home / desk / kitchen organization.`;
  } else if (fit === 3) {
    if (commerce >= 80 && margin >= 45) {
      listing_verdict = 'Extra';
      listing_reason = `Maybe as an extra past 30. Adjacent, not a core organizer. Strong numbers (${commerceGrade}, ${margin}% margin).`;
    } else {
      listing_reason = `Do not list. Adjacent at best, and ${commerceGrade} / ${margin}% margin is not strong enough for an extra slot.`;
    }
  } else if (commerce >= 80 && margin >= 40) {
    listing_verdict = 'List';
    listing_reason = `List. Core niche with ${commerceGrade} numbers (${commerce}) and ${margin}% margin.`;
  } else {
    listing_verdict = 'Maybe later';
    listing_reason = `Maybe later. Fits the store, but ${commerceGrade} (${commerce}) is not strong enough to take a launch slot.`;
  }

  return {
    listing_verdict,
    listing_reason,
    decision_action: listing_verdict,
    decision_confidence: clamp(commerce, 0, 100),
    decision_reason: listing_reason
  };
}

export function isShortlistReady(product) {
  const isCloseout = String(product.subcategory || '').toLowerCase().includes('closeout');

  return !isCloseout
    && (product.overall_score ?? 0) >= SHORTLIST_THRESHOLDS.minOverallScore
    && (product.fit_score ?? 0) >= SHORTLIST_THRESHOLDS.minFitScore
    && (product.estimated_margin ?? 0) >= SHORTLIST_THRESHOLDS.minEstimatedMargin;
}

export function buildShortlistReason(product) {
  if ((product.fit_score ?? 0) < SHORTLIST_THRESHOLDS.minFitScore) {
    return product.fit_reason || 'Off-niche. Skip for a curated organization store.';
  }

  if ((product.estimated_margin ?? 0) < SHORTLIST_THRESHOLDS.minEstimatedMargin) {
    return 'Margin is below 40% after product cost, shipping, and Shopify fees.';
  }

  if ((product.overall_score ?? 0) < SHORTLIST_THRESHOLDS.minOverallScore) {
    return `Overall ${product.overall_score ?? 0}. Need 80+ (Consider) or 90+ (Add Immediately) for the 30-SKU launch.`;
  }

  if (product.shipping_cost > SHORTLIST_THRESHOLDS.maxShippingCost) {
    return 'Fits the niche, but shipping is expensive — confirm US shipping before listing.';
  }

  return `Grade ${product.grade}. Fits the organization niche with ${product.estimated_margin}% margin.`;
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function mapWorkspaceExport(record, index) {
  const category = normalizeCategoryName(record['Category']);
  const subcategory = normalizeSubcategoryName(record['Subcategory']);
  const supplierCost = toNumber(record['Wholesale Price']);
  const minQuantity = toNumber(record['Min Quantity']);
  const casePackQuantity = toNumber(record['Case Pack Quantity']);
  const perPieceWeight = toNumber(record['Per Piece Weight']);
  const shippingCost = estimateShippingCost(perPieceWeight, category, casePackQuantity);
  const productPrice = estimateRetailPrice(category, supplierCost, shippingCost);
  const marketScore = estimateMarketScore(category, subcategory, supplierCost, minQuantity);
  const competitionScore = estimateCompetition(category, minQuantity);
  const competitorPrice = estimateCompetitorPrice(productPrice, marketScore, category);
  const estimatedMargin = calculateEstimatedMargin(productPrice, supplierCost, shippingCost);
  const imageUrls = collectImageUrls(record);
  const embeddedImages = collectEmbeddedImages(record);
  const imageAltText = pickImageAltText(record, record['Product Name'] || `Unnamed Product ${index + 1}`);
  const imageSourcingStatus = imageUrls.length > 0
    ? 'Image ready'
    : embeddedImages.length > 0
      ? 'Embedded image extracted'
      : 'Needs image sourcing';

  const product = {
    product_id: index + 1,
    source_product_id: record['Product Item #'] || `RAW-${index + 1}`,
    upc: record['UPC Code'] || '',
    name: record['Product Name'] || `Unnamed Product ${index + 1}`,
    category,
    subcategory,
    product_price: productPrice,
    price: productPrice,
    supplier_cost: Number(supplierCost.toFixed(2)),
    wholesale_price: Number(supplierCost.toFixed(2)),
    shipping_cost: shippingCost,
    competitor_price: competitorPrice,
    market_score: marketScore,
    competition_score: competitionScore,
    estimated_margin: estimatedMargin,
    min_quantity: minQuantity,
    case_pack_quantity: casePackQuantity,
    per_piece_weight: Number(perPieceWeight.toFixed(4)),
    image_urls: imageUrls,
    image_src: imageUrls[0] || '',
    image_alt_text: imageAltText,
    image_sourcing_status: imageSourcingStatus,
    embedded_images: embeddedImages,
    source: 'workspace-export',
    warehouse: getRecordValue(record, ['Warehouse', 'Warehouse Location', 'Stock Location', 'Ship From', 'Shipping From', 'From Warehouse', 'Origin']),
    ship_from: getRecordValue(record, ['Ship From', 'Shipping From', 'From Warehouse', 'Warehouse']),
    shipping_time: getRecordValue(record, ['Shipping Time', 'Delivery Time', 'Delivery Days', 'Processing Time', 'Lead Time', 'Transit Time', 'Estimated Delivery']),
    delivery_days_label: getRecordValue(record, ['Shipping Time', 'Delivery Time', 'Estimated Delivery']),
    supplier_region: getRecordValue(record, ['Warehouse', 'Ship From', 'Country', 'Origin', 'Region'])
  };

  return enrichCatalogScoring(product);
}

export function mapSampleProduct(record) {
  const category = record.category || 'General';
  const baseProductPrice = toNumber(record.price);
  const supplierCost = Number((baseProductPrice * 0.42).toFixed(2));
  const shippingCost = estimateShippingCost(0.4, category, 12);
  const productPrice = estimateRetailPrice(category, supplierCost, shippingCost);
  const marketScore = toNumber(record.market_score, 50);
  const competitionScore = clamp(100 - marketScore + 20, 20, 90);
  const competitorPrice = estimateCompetitorPrice(productPrice, marketScore, category);
  const estimatedMargin = calculateEstimatedMargin(productPrice, supplierCost, shippingCost);

  const product = {
    product_id: toNumber(record.product_id),
    source_product_id: `SAMPLE-${record.product_id}`,
    upc: '',
    name: record.name,
    category,
    subcategory: 'General',
    product_price: productPrice,
    price: productPrice,
    supplier_cost: supplierCost,
    wholesale_price: supplierCost,
    shipping_cost: shippingCost,
    competitor_price: competitorPrice,
    market_score: marketScore,
    competition_score: competitionScore,
    estimated_margin: estimatedMargin,
    min_quantity: 1,
    case_pack_quantity: 1,
    per_piece_weight: 0.4,
    image_urls: [],
    image_src: '',
    image_alt_text: record.name || '',
    image_sourcing_status: 'Needs image sourcing',
    source: 'sample-data'
  };

  return enrichCatalogScoring(product);
}