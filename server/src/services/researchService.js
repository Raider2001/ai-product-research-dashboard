import { getAllProducts, getOpportunityScores, getSuppliers, searchProducts } from './dataService.js';
import { calculateUnitEconomics, pickLaunchCatalog } from '../../../shared/productPipeline.js';

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

export async function researchProducts(query) {
  const queryText = String(query || '').toLowerCase();
  const allProducts = await getAllProducts();
  const matches = (await searchProducts(query)).slice(0, 8);
  const ranked = [...(matches.length > 0 ? matches : allProducts)]
    .sort((left, right) => (right.overall_score ?? 0) - (left.overall_score ?? 0))
    .slice(0, 8);

  const lines = ranked.map((product, index) => {
    return `${index + 1}. ${product.name} | ${product.collection || product.category} | grade ${product.grade} | overall ${product.overall_score} | fit ${product.fit_score}/5 | margin ${product.estimated_margin}% | profit ${formatCurrency(product.profit_dollars ?? 0)} | ${product.consumer_behavior_note}`;
  });

  const launch = pickLaunchCatalog(allProducts);
  const wantsLaunch = /launch|30|catalog|niche|organiz/.test(queryText);

  return {
    success: true,
    task: 'research_products',
    response: [
      `Research for: ${query}`,
      '',
      'Niche: Home Organization + Desk & Office + Kitchen Organization.',
      'Scoring: Fit 30% + Profit 30% + Shipping 20% + Competition 10% + Quality 10%.',
      '90+ Add Immediately · 80-89 Consider · 70-79 Test Later · below 70 Skip.',
      '',
      'Ranked products to review:',
      ...lines,
      '',
      wantsLaunch
        ? `Launch catalog currently holds ${launch.length} of 30 slots (10 per collection). Do not pad with off-niche SKUs.`
        : 'Ask about the launch catalog if you want the 10 / 10 / 10 shortlist.',
      '',
      'Before listing: confirm US shipping days, photos, and Amazon/Walmart comps. If Amazon is $9.99 and you need $24.99, skip.'
    ].join('\n')
  };
}

export async function analyzeSuppliers(category) {
  const suppliers = (await getSuppliers()).suppliers;
  const lines = suppliers.map((supplier, index) => {
    const usBased = /usa|u\.s\.|united states|\bus\b/i.test(String(supplier.region || '')) ? 'Y' : 'N';
    return `${index + 1}. ${supplier.name} | region ${supplier.region} | US based ${usBased} | lead time ${supplier.lead_time} days | support/quality ${supplier.score}`;
  });

  return {
    success: true,
    task: 'analyze_suppliers',
    response: [
      `Supplier overview${category ? ` (${category})` : ''}`,
      '',
      'Track: supplier name, US based Y/N, response time, return policy, support quality 1-5.',
      suppliers.length > 0 ? 'Current supplier file:' : 'No supplier file is loaded yet.',
      ...lines,
      '',
      'Prefer US warehouses with 2-7 day delivery for the organization launch. 14+ days should score 1 on shipping and usually gets skipped.'
    ].join('\n')
  };
}

export function calculateProfitMargin(productName, cost, marketPrice, shipping = 0, advertising = 0) {
  const economics = calculateUnitEconomics(marketPrice, cost, shipping, advertising);

  return {
    success: true,
    task: 'profit_analysis',
    response: [
      `Profit analysis for ${productName}`,
      '',
      `Sell price: ${formatCurrency(marketPrice)}`,
      `Cost: ${formatCurrency(cost)}`,
      `Shipping: ${formatCurrency(shipping)}`,
      `Shopify fees: ${formatCurrency(economics.shopify_fees)}`,
      `Advertising: ${formatCurrency(economics.advertising_cost)}`,
      `Profit: ${formatCurrency(economics.profit_dollars)}`,
      `Margin: ${economics.estimated_margin.toFixed(1)}%`,
      '',
      economics.estimated_margin >= 50
        ? 'Viability: 50%+ — preferred for the launch catalog.'
        : economics.estimated_margin >= 40
          ? 'Viability: 40%+ — acceptable, but watch ads and returns.'
          : 'Viability: below 40% after fees. Skip unless cost or shipping drops.'
    ].join('\n')
  };
}

export function getKeywords(productName, category) {
  const baseName = productName.trim() || 'organizer';
  const baseCategory = category.trim() || 'home organization';
  const keywords = [
    `${baseName}`,
    `${baseCategory} organizer`,
    `bamboo ${baseName}`,
    `desk drawer organizer`,
    `pantry storage containers`,
    `closet storage bins`,
    `${baseName} for small spaces`
  ];

  return {
    success: true,
    task: 'keywords',
    response: [
      `Keyword ideas for ${baseName} (${baseCategory}):`,
      '',
      ...keywords.map((keyword, index) => `${index + 1}. ${keyword}`),
      '',
      'Stay in Home / Desk / Kitchen organization. Do not mix pet toys, speakers, or car accessories into this catalog.'
    ].join('\n')
  };
}

export async function scoreOpportunities() {
  return {
    success: true,
    task: 'opportunity_scoring',
    opportunities: await getOpportunityScores()
  };
}
