import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AIChat from './components/AIChat';
import ProductFilter from './components/ProductFilter';
import PriceDistributionChart from './components/charts/PriceDistributionChart';
import MarketScoreTrendChart from './components/charts/MarketScoreTrendChart';
import OpportunityScoringChart from './components/charts/OpportunityScoringChart';
import MarginCalculator from './components/MarginCalculator';
import ResearchNotes from './components/ResearchNotes';
import RevenueGoalPlanner from './components/RevenueGoalPlanner';

const SHOPIFY_FEE_RATE = 0.029;
const SHOPIFY_FEE_FIXED = 0.3;

const LAUNCH_COLLECTIONS = [
    { id: 'home_organization', name: 'Home Organization' },
    { id: 'desk_office', name: 'Desk & Office' },
    { id: 'kitchen_organization', name: 'Kitchen Organization' },
];

function shopifyFees(price) {
    return Number(((Number(price) * SHOPIFY_FEE_RATE) + SHOPIFY_FEE_FIXED).toFixed(2));
}

function unitEconomics(price, cost, shipping, ads = 0) {
    const sell = Math.max(Number(price) || 0, 0);
    const fees = shopifyFees(sell);
    const profit = Number((sell - (Number(cost) || 0) - (Number(shipping) || 0) - fees - (Number(ads) || 0)).toFixed(2));
    const margin = sell > 0 ? Number(((profit / sell) * 100).toFixed(1)) : 0;
    return { fees, profit, margin };
}

function gradeClass(grade) {
    if (grade === 'Add Immediately') return 'status-pill-ready';
    if (grade === 'Consider') return 'status-pill-test';
    if (grade === 'Test Later') return 'status-pill-hold';
    return 'status-pill-skip';
}

function toSpreadsheetRow(product) {
    return {
        'Product Name': product.name || '',
        Category: product.collection || product.category || '',
        Supplier: product.supplier_name || 'Unknown',
        'US Based (Y/N)': product.us_based || 'N',
        Warehouse: product.warehouse || product.ship_from || '',
        Cost: Number(product.supplier_cost ?? 0).toFixed(2),
        Shipping: Number(product.shipping_cost ?? 0).toFixed(2),
        'Retail Price': Number(product.product_price ?? product.price ?? 0).toFixed(2),
        'Shopify Fees': Number(product.shopify_fees ?? shopifyFees(product.product_price ?? product.price ?? 0)).toFixed(2),
        'Profit $': Number(product.profit_dollars ?? 0).toFixed(2),
        'Margin %': Number(product.estimated_margin ?? 0).toFixed(1),
        'Days to Ship': product.delivery_days_label || product.delivery_days || '',
        'Delivery Days': product.delivery_days ?? '',
        'Competition Score': product.competition_grade ?? '',
        'Quality Score': product.quality_score ?? '',
        'Fit Score': product.fit_score ?? '',
        'Overall Score': product.overall_score ?? '',
        Grade: product.grade || '',
        'List?': product.listing_verdict || '',
        'List reason': product.listing_reason || product.decision_reason || '',
        Notes: [product.fit_reason, product.consumer_behavior_note, product.shortlist_reason].filter(Boolean).join(' '),
    };
}

function collapseVisibleProducts(products) {
    const groups = new Map();

    for (const product of products || []) {
        const key = String(product.name || '').toLowerCase().replace(/\s+/g, ' ').trim() || String(product.product_id);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(product);
    }

    return [...groups.values()].map((rows) => {
        const ranked = [...rows].sort((left, right) => {
            const leftUs = left.us_based === 'Y' ? 0 : 1;
            const rightUs = right.us_based === 'Y' ? 0 : 1;
            if (leftUs !== rightUs) return leftUs - rightUs;
            return (Number(right.overall_score) || 0) - (Number(left.overall_score) || 0);
        });
        return { ...ranked[0], variant_row_count: rows.reduce((sum, row) => sum + (Number(row.variant_row_count) || 1), 0) };
    });
}

function listingClass(verdict) {
    if (verdict === 'List') return 'status-pill-ready';
    if (verdict === 'Extra') return 'status-pill-test';
    if (verdict === 'Maybe later') return 'status-pill-hold';
    return 'status-pill-skip';
}

function pickLaunchCatalog(products, perCollection = 10, usOnly = true) {
    const rank = { List: 0, Extra: 1, 'Maybe later': 2 };
    const eligible = (product) => !usOnly || product.us_based === 'Y';
    const byLaunchOrder = (left, right) => {
        const verdictGap = (rank[left.listing_verdict] ?? 9) - (rank[right.listing_verdict] ?? 9);
        if (verdictGap !== 0) return verdictGap;
        return (right.overall_score ?? 0) - (left.overall_score ?? 0);
    };

    const core = LAUNCH_COLLECTIONS.flatMap((collection) => (
        [...products]
            .filter((product) => product.collection_id === collection.id && eligible(product))
            .filter((product) => product.listing_verdict === 'List' || (product.fit_score === 5 && product.listing_verdict !== 'Do not list'))
            .sort(byLaunchOrder)
            .slice(0, perCollection)
            .map((product) => ({ ...product, launch_slot: 'core' }))
    ));
    const taken = new Set(core.map((product) => product.product_id));
    const extras = [...products]
        .filter((product) => eligible(product) && !taken.has(product.product_id) && product.listing_verdict === 'Extra')
        .sort(byLaunchOrder)
        .slice(0, 8)
        .map((product) => ({ ...product, launch_slot: 'extra' }));

    return [...core, ...extras];
}

function App() {
    const [activeTab, setActiveTab] = useState('products');
    const [darkMode, setDarkMode] = useState(false);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [scoringOpportunities, setScoringOpportunities] = useState(false);
    const [originFilter, setOriginFilter] = useState('us');
    const [importStatus, setImportStatus] = useState('');
    const [importing, setImporting] = useState(false);
    const [gradeFilter, setGradeFilter] = useState('all');
    const [listingFilter, setListingFilter] = useState('all');
    const [collectionFilter, setCollectionFilter] = useState('all');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [whatIfPrice, setWhatIfPrice] = useState('');
    const [whatIfAds, setWhatIfAds] = useState('0');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [productsRes, suppliersRes, analyticsRes] = await Promise.all([
                fetch(`${API_BASE}/products?limit=5000`),
                fetch(`${API_BASE}/suppliers`),
                fetch(`${API_BASE}/analytics`)
            ]);

            if (productsRes.ok) {
                const productsData = await productsRes.json();
                const uniqueProducts = collapseVisibleProducts(productsData.products || []);
                setProducts({ ...productsData, products: uniqueProducts, total: uniqueProducts.length });
                setFilteredProducts(uniqueProducts);
                setCurrentPage(1);
            }
            if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
            if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/products/search/?q=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults({ ...data, results: collapseVisibleProducts(data.results) });
                setCurrentPage(1);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    };

    const handleImportFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportStatus('');
        try {
            const name = String(file.name || '').toLowerCase();
            if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
                throw new Error('Use the smaller CJ CSV export, not the Excel workbook (the .xlsx can be hundreds of MB). In CJ choose CSV, or open the workbook and Save As CSV.');
            }
            if (file.size > 70 * 1024 * 1024) {
                throw new Error('That file is too large for this importer. Export a filtered US-warehouse CSV from CJ instead of the full catalog workbook.');
            }

            const csvText = await file.text();
            const res = await fetch(`${API_BASE}/imports/catalog`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvText, filename: file.name })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || `Import failed (${res.status}).`);
            }
            setImportStatus(`Loaded ${data.total} unique products from ${file.name}. CJ still listed ${data.raw_row_count} rows; ${data.collapsed_row_count || 0} extras were folded. Every item gets a numbers grade plus a List / Extra / Do not list call. Launch export is 30 core SKUs plus up to 8 strong extras. Shopify was not updated.`);
            await fetchData();
        } catch (error) {
            setImportStatus(error.message || 'Could not import that file. Use a CSV export from CJ.');
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };

    const handleScoreOpportunities = async () => {
        setScoringOpportunities(true);
        try {
            const res = await fetch(`${API_BASE}/agent/opportunities`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.opportunities) {
                    setOpportunities(data.opportunities);
                }
            }
        } catch (error) {
            console.error('Opportunity scoring error:', error);
        } finally {
            setScoringOpportunities(false);
        }
    };

    const toggleDarkMode = () => {
        const next = !darkMode;
        setDarkMode(next);
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    };

    const exportCSV = (data, filename) => {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map((row) =>
            Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const fullProducts = products.products || [];
    const originScopedProducts = useMemo(() => {
        if (originFilter !== 'us') {
            return fullProducts;
        }
        return fullProducts.filter((product) => product.us_based === 'Y');
    }, [fullProducts, originFilter]);

    const launchCatalog = useMemo(() => pickLaunchCatalog(originScopedProducts, 10, originFilter === 'us'), [originScopedProducts, originFilter]);

    const gradeCounts = useMemo(() => ({
        add: fullProducts.filter((product) => product.grade === 'Add Immediately').length,
        consider: fullProducts.filter((product) => product.grade === 'Consider').length,
        later: fullProducts.filter((product) => product.grade === 'Test Later').length,
        skip: fullProducts.filter((product) => product.grade === 'Skip').length,
        list: fullProducts.filter((product) => product.listing_verdict === 'List').length,
        extra: fullProducts.filter((product) => product.listing_verdict === 'Extra').length,
        noList: fullProducts.filter((product) => product.listing_verdict === 'Do not list').length,
        niche: fullProducts.filter((product) => product.fit_score === 5).length,
    }), [fullProducts]);

    const baseProducts = useMemo(() => {
        return searchResults ? searchResults.results : filteredProducts;
    }, [searchResults, filteredProducts]);

    const decisionFilteredProducts = useMemo(() => {
        return (baseProducts || []).filter((product) => {
            const gradeOk = gradeFilter === 'all' || product.grade === gradeFilter;
            const collectionOk = collectionFilter === 'all' || product.collection_id === collectionFilter;
            const originOk = originFilter !== 'us' || product.us_based === 'Y';
            const listingOk = listingFilter === 'all' || product.listing_verdict === listingFilter;
            return gradeOk && collectionOk && originOk && listingOk;
        });
    }, [baseProducts, gradeFilter, collectionFilter, originFilter, listingFilter]);

    const runtimeRankedProducts = useMemo(() => {
        const rank = { 'Add Immediately': 0, Consider: 1, 'Test Later': 2, Skip: 3 };
        return [...decisionFilteredProducts].sort((left, right) => {
            const listRank = { List: 0, Extra: 1, 'Maybe later': 2, 'Do not list': 3 };
            const listGap = (listRank[left.listing_verdict] ?? 9) - (listRank[right.listing_verdict] ?? 9);
            if (listGap !== 0) return listGap;
            const gradeGap = (rank[left.grade] ?? 9) - (rank[right.grade] ?? 9);
            if (gradeGap !== 0) return gradeGap;
            return (right.overall_score ?? 0) - (left.overall_score ?? 0);
        });
    }, [decisionFilteredProducts]);

    const totalRows = runtimeRankedProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, totalRows);
    const pagedProducts = runtimeRankedProducts.slice(pageStart, pageEnd);

    const tabs = [
        { id: 'products', label: 'Products' },
        { id: 'launch', label: 'Launch catalog' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'opportunities', label: 'Scoring' },
        { id: 'suppliers', label: 'Suppliers' },
        { id: 'tools', label: 'Tools + BizChat' },
    ];

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <h1>Product research dashboard</h1>
                <p>Private scoring tool on your computer. Customers never see this. Import a CJ CSV here first, grade US-warehouse products, then send only the winners to Shopify.</p>
                <button className="dark-mode-toggle" onClick={toggleDarkMode}>
                    {darkMode ? 'Light mode' : 'Dark mode'}
                </button>
            </header>

            <section className="import-bar">
                <div>
                    <strong>1. Import CJ list</strong>
                    <p>Upload a CSV from CJ (not the live store). Scoring stays on this machine.</p>
                </div>
                <label className="btn-primary import-file-label">
                    {importing ? 'Importing…' : 'Import product CSV'}
                    <input type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} disabled={importing} />
                </label>
                {importStatus && <p className="import-status">{importStatus}</p>}
            </section>

            {analytics && (
                <section className="analytics-cards">
                    <div className="card">
                        <div className="card-value">{analytics.total_products}</div>
                        <div className="card-label">Supplier catalog</div>
                    </div>
                    <div className="card">
                        <div className="card-value">{analytics.relevant_to_niche ?? gradeCounts.niche}</div>
                        <div className="card-label">Fit the niche (5/5)</div>
                    </div>
                    <div className="card">
                        <div className="card-value">{analytics.high_quality ?? 0}</div>
                        <div className="card-label">High quality (80+ and fit)</div>
                    </div>
                    <div className="card">
                        <div className="card-value">{analytics.us_warehouse_count ?? 0}</div>
                        <div className="card-label">US warehouse SKUs</div>
                    </div>
                    <div className="card">
                        <div className="card-value">{launchCatalog.length}/{analytics.launch_target || 38}</div>
                        <div className="card-label">Launch + extras</div>
                    </div>
                    <div className="card">
                        <div className="card-value">{analytics.avg_estimated_margin.toFixed(1)}%</div>
                        <div className="card-label">Avg margin</div>
                    </div>
                    <div className="card">
                        <div className="card-value">${analytics.avg_price.toFixed(2)}</div>
                        <div className="card-label">Avg retail</div>
                    </div>
                </section>
            )}

            <nav className="tab-nav">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {activeTab === 'products' && (
                <section className="tab-content">
                    <div className="tab-title-row">
                        <h2>Grade every SKU</h2>
                        <button
                            className="btn-export"
                            onClick={() => exportCSV(runtimeRankedProducts.map(toSpreadsheetRow), 'product-selection-scores.csv')}
                            disabled={runtimeRankedProducts.length === 0}
                        >
                            Download score sheet
                        </button>
                        <button
                            className="btn-export"
                            onClick={() => exportCSV(launchCatalog.map(toSpreadsheetRow), 'launch-catalog.csv')}
                            disabled={launchCatalog.length === 0}
                        >
                            Download launch list
                        </button>
                    </div>
                    <p className="import-status">
                        Import the new CJ CSV here. Every product gets a numbers grade even if it is off-niche, plus a <strong>List / Extra / Do not list</strong> call. Download launch list is 10+10+10 core SKUs and up to 8 strong extras.
                    </p>

                    <section className="search-section">
                        <form onSubmit={handleSearch} className="search-form">
                            <input
                                type="text"
                                placeholder="Search by product name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            <button type="submit" className="btn-primary">Search</button>
                            {searchResults && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchResults(null); setSearchQuery(''); }}
                                    className="btn-secondary"
                                >
                                    Clear
                                </button>
                            )}
                        </form>
                    </section>

                    <section className="decision-overview">
                        <div className="decision-card decision-list-now">
                            <div className="decision-card-value">{gradeCounts.list}</div>
                            <div className="decision-card-label">List (core niche)</div>
                        </div>
                        <div className="decision-card decision-test-carefully">
                            <div className="decision-card-value">{gradeCounts.extra}</div>
                            <div className="decision-card-label">Extra (past 30)</div>
                        </div>
                        <div className="decision-card decision-hold">
                            <div className="decision-card-value">{gradeCounts.add + gradeCounts.consider}</div>
                            <div className="decision-card-label">Strong numbers (80+)</div>
                        </div>
                        <div className="decision-card decision-skip">
                            <div className="decision-card-value">{gradeCounts.noList}</div>
                            <div className="decision-card-label">Do not list</div>
                        </div>
                    </section>

                    {!searchResults && products.products && (
                        <ProductFilter
                            products={products.products}
                            onFilter={(nextProducts) => {
                                setFilteredProducts(nextProducts);
                                setCurrentPage(1);
                            }}
                        />
                    )}

                    <section className="product-controls">
                        <div className="control-group">
                            <label htmlFor="origin-filter">Warehouse</label>
                            <select
                                id="origin-filter"
                                value={originFilter}
                                onChange={(e) => {
                                    setOriginFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="us">US only</option>
                                <option value="all">All countries</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label htmlFor="collection-filter">Collection</label>
                            <select
                                id="collection-filter"
                                value={collectionFilter}
                                onChange={(e) => {
                                    setCollectionFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="all">All collections</option>
                                {LAUNCH_COLLECTIONS.map((collection) => (
                                    <option key={collection.id} value={collection.id}>{collection.name}</option>
                                ))}
                                <option value="adjacent">Adjacent (review)</option>
                                <option value="out_of_niche">Out of niche</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label htmlFor="grade-filter">Grade</label>
                            <select
                                id="grade-filter"
                                value={gradeFilter}
                                onChange={(e) => {
                                    setGradeFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="all">All grades</option>
                                <option value="Add Immediately">Add Immediately</option>
                                <option value="Consider">Consider</option>
                                <option value="Test Later">Test Later</option>
                                <option value="Skip">Skip</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label htmlFor="listing-filter">List?</label>
                            <select
                                id="listing-filter"
                                value={listingFilter}
                                onChange={(e) => {
                                    setListingFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="all">All suggestions</option>
                                <option value="List">List</option>
                                <option value="Extra">Extra</option>
                                <option value="Maybe later">Maybe later</option>
                                <option value="Do not list">Do not list</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label htmlFor="page-size">Rows</label>
                            <select
                                id="page-size"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <p className="results-count">
                            Showing {totalRows === 0 ? 0 : pageStart + 1}-{pageEnd} of {totalRows}
                        </p>
                    </section>

                    {loading && <p className="loading">Loading data...</p>}
                    {!loading && pagedProducts.length > 0 ? (
                        <div className="table-container">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Collection</th>
                                        <th>List?</th>
                                        <th>Grade</th>
                                        <th>Overall</th>
                                        <th>Fit</th>
                                        <th>Cost</th>
                                        <th>Ship</th>
                                        <th>Retail</th>
                                        <th>Profit $</th>
                                        <th>Margin</th>
                                        <th>Days to ship</th>
                                        <th>Warehouse</th>
                                        <th>Comp</th>
                                        <th>Quality</th>
                                        <th>US</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedProducts.map((product) => (
                                        <tr key={product.product_id}>
                                            <td>{product.name}</td>
                                            <td><span className="badge">{product.collection || product.category}</span></td>
                                            <td>
                                                <span className={`status-pill ${listingClass(product.listing_verdict)}`}>
                                                    {product.listing_verdict || 'Do not list'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-pill ${gradeClass(product.grade)}`}>
                                                    {product.grade || 'Skip'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="score-bar">
                                                    <div
                                                        className="score-fill"
                                                        style={{
                                                            width: `${product.overall_score || 0}%`,
                                                            backgroundColor: (product.overall_score || 0) >= 90 ? '#22c55e'
                                                                : (product.overall_score || 0) >= 80 ? '#3b82f6'
                                                                : (product.overall_score || 0) >= 70 ? '#f59e0b' : '#ef4444'
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="score-text">{product.overall_score}</span>
                                            </td>
                                            <td>{product.fit_score}/5</td>
                                            <td className="price">${Number(product.supplier_cost ?? 0).toFixed(2)}</td>
                                            <td className="price">${Number(product.shipping_cost ?? 0).toFixed(2)}</td>
                                            <td className="price">${Number(product.product_price ?? product.price ?? 0).toFixed(2)}</td>
                                            <td className="price">${Number(product.profit_dollars ?? 0).toFixed(2)}</td>
                                            <td>{Number(product.estimated_margin ?? 0).toFixed(1)}%</td>
                                            <td>{product.delivery_days_label || product.delivery_days || '—'}</td>
                                            <td>{product.warehouse || product.ship_from || '—'}</td>
                                            <td>{product.competition_grade ?? '—'}/5</td>
                                            <td>{product.quality_score ?? '—'}/5</td>
                                            <td>{product.us_based || 'N'}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-secondary btn-detail"
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setWhatIfPrice(String(Number(product.product_price ?? product.price ?? 0).toFixed(2)));
                                                        setWhatIfAds('0');
                                                    }}
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        !loading && <p className="no-data">No products found</p>
                    )}

                    {!loading && totalRows > 0 && (
                        <section className="pagination-controls">
                            <button className="btn-secondary" disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</button>
                            <p>Page {safePage} of {totalPages}</p>
                            <button className="btn-secondary" disabled={safePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Next</button>
                        </section>
                    )}

                    {selectedProduct && (
                        <section className="decision-drawer-backdrop" onClick={() => setSelectedProduct(null)}>
                            <aside className="decision-drawer" onClick={(event) => event.stopPropagation()}>
                                <div className="decision-drawer-header">
                                    <h3>{selectedProduct.name}</h3>
                                    <button type="button" className="btn-secondary" onClick={() => setSelectedProduct(null)}>Close</button>
                                </div>
                                <p className="decision-drawer-subtitle">
                                    {selectedProduct.listing_verdict || 'Do not list'} · {selectedProduct.grade} · {selectedProduct.overall_score} · {selectedProduct.collection}
                                </p>

                                <div className="decision-detail-grid">
                                    <div>
                                        <h4>Unit economics</h4>
                                        <p>Sell: ${Number(selectedProduct.product_price ?? selectedProduct.price ?? 0).toFixed(2)}</p>
                                        <p>Cost: ${Number(selectedProduct.supplier_cost ?? 0).toFixed(2)}</p>
                                        <p>Shipping: ${Number(selectedProduct.shipping_cost ?? 0).toFixed(2)}</p>
                                        <p>Shopify fees: ${Number(selectedProduct.shopify_fees ?? 0).toFixed(2)}</p>
                                        <p>Profit: ${Number(selectedProduct.profit_dollars ?? 0).toFixed(2)}</p>
                                        <p>Margin: {Number(selectedProduct.estimated_margin ?? 0).toFixed(1)}% (want 40%, prefer 50%+)</p>
                                    </div>
                                    <div>
                                        <h4>Scores</h4>
                                        <p>Fit {selectedProduct.fit_score}/5 — {selectedProduct.fit_reason}</p>
                                        <p>Shipping {selectedProduct.shipping_score}/5 — {selectedProduct.delivery_days_label || `${selectedProduct.delivery_days} days`} (grader uses the slower end of the range). US warehouse: {selectedProduct.us_based}</p>
                                        <p>Warehouses in file: {selectedProduct.warehouse_options || selectedProduct.warehouse || '—'}. Duplicate rows collapsed: {selectedProduct.variant_row_count || 1}.</p>
                                        <p>{selectedProduct.shipping_origin_note}</p>
                                        <p>Quality {selectedProduct.quality_score}/5 — {selectedProduct.quality_reason}</p>
                                        <p>Competition {selectedProduct.competition_grade}/5 — {selectedProduct.competition_reason}</p>
                                    </div>
                                </div>

                                <div className="decision-notes">
                                    <h4>Should you list this?</h4>
                                    <p>{selectedProduct.listing_reason || selectedProduct.decision_reason}</p>
                                    <p>{selectedProduct.consumer_behavior_note}</p>
                                </div>

                                <div className="decision-notes">
                                    <h4>Competition check</h4>
                                    <p>If Amazon sells it for $9.99 and you need $24.99, skip.</p>
                                    <p>
                                        <a href={selectedProduct.amazon_search_url} target="_blank" rel="noreferrer">Search Amazon</a>
                                        {' · '}
                                        <a href={selectedProduct.walmart_search_url} target="_blank" rel="noreferrer">Search Walmart</a>
                                    </p>
                                </div>

                                <div className="decision-notes what-if-panel">
                                    <h4>What-if (includes Shopify fees)</h4>
                                    <div className="what-if-controls">
                                        <label htmlFor="what-if-price">Retail price</label>
                                        <input id="what-if-price" type="number" min="0" step="0.01" value={whatIfPrice} onChange={(event) => setWhatIfPrice(event.target.value)} />
                                        <label htmlFor="what-if-ads">Ad spend / unit</label>
                                        <input id="what-if-ads" type="number" min="0" step="0.01" value={whatIfAds} onChange={(event) => setWhatIfAds(event.target.value)} />
                                    </div>
                                    {(() => {
                                        const result = unitEconomics(
                                            whatIfPrice,
                                            selectedProduct.supplier_cost,
                                            selectedProduct.shipping_cost,
                                            whatIfAds
                                        );
                                        return (
                                            <div className="what-if-metrics">
                                                <p>Shopify fees: ${result.fees.toFixed(2)}</p>
                                                <p>Profit: ${result.profit.toFixed(2)}</p>
                                                <p>Margin: {result.margin.toFixed(1)}%</p>
                                                <p>
                                                    {result.margin >= 50
                                                        ? 'Preferred 50%+ band.'
                                                        : result.margin >= 40
                                                            ? 'Hits the 40% floor. Watch ads.'
                                                            : 'Below 40%. Do not add to launch.'}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </aside>
                        </section>
                    )}
                </section>
            )}

            {activeTab === 'launch' && (
                <section className="tab-content">
                    <div className="tab-title-row">
                        <h2>Launch catalog (30 core + extras)</h2>
                        <button
                            className="btn-export"
                            onClick={() => exportCSV(launchCatalog.map(toSpreadsheetRow), 'launch-catalog.csv')}
                            disabled={launchCatalog.length === 0}
                        >
                            Download launch CSV
                        </button>
                    </div>
                    <p>US warehouse by default. Up to 10 Home + 10 Desk + 10 Kitchen, then up to 8 adjacent extras with a List/Extra suggestion. Off-niche items are graded but not added unless they earn an Extra slot.</p>
                    <section className="decision-overview">
                        {LAUNCH_COLLECTIONS.map((collection) => {
                            const filled = launchCatalog.filter((product) => product.collection_id === collection.id && product.launch_slot !== 'extra').length;
                            return (
                                <div key={collection.id} className="decision-card">
                                    <div className="decision-card-value">{filled}/10</div>
                                    <div className="decision-card-label">{collection.name}</div>
                                </div>
                            );
                        })}
                        <div className="decision-card">
                            <div className="decision-card-value">{launchCatalog.filter((product) => product.launch_slot === 'extra').length}/8</div>
                            <div className="decision-card-label">Extras past 30</div>
                        </div>
                    </section>
                    <div className="table-container">
                        <table className="products-table">
                            <thead>
                                <tr>
                                    <th>Collection</th>
                                    <th>Slot</th>
                                    <th>Product</th>
                                    <th>List?</th>
                                    <th>Grade</th>
                                    <th>Overall</th>
                                    <th>Margin</th>
                                    <th>Profit</th>
                                    <th>Fit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {launchCatalog.map((product) => (
                                    <tr key={`launch-${product.product_id}`}>
                                        <td>{product.collection}</td>
                                        <td>{product.launch_slot === 'extra' ? 'Extra' : 'Core'}</td>
                                        <td>{product.name}</td>
                                        <td><span className={`status-pill ${listingClass(product.listing_verdict)}`}>{product.listing_verdict || '—'}</span></td>
                                        <td><span className={`status-pill ${gradeClass(product.grade)}`}>{product.grade}</span></td>
                                        <td>{product.overall_score}</td>
                                        <td>{Number(product.estimated_margin ?? 0).toFixed(1)}%</td>
                                        <td>${Number(product.profit_dollars ?? 0).toFixed(2)}</td>
                                        <td>{product.fit_score}/5</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {launchCatalog.length === 0 && <p className="no-data">No List or Extra products yet. Import the new CJ CSV and check the List? column.</p>}
                </section>
            )}

            {activeTab === 'analytics' && (
                <section className="tab-content">
                    <h2>Catalog funnel</h2>
                    <p>Supplier dump → grade every item → List / Extra / Do not list → launch 30 plus up to 8 extras. Only that last file should go to Shopify.</p>
                    <div className="charts-grid">
                        {fullProducts.length > 0 && (
                            <>
                                <PriceDistributionChart products={fullProducts} />
                                <MarketScoreTrendChart products={fullProducts} />
                            </>
                        )}
                    </div>
                </section>
            )}

            {activeTab === 'opportunities' && (
                <section className="tab-content">
                    <div className="tab-title-row">
                        <h2>Weighted opportunity scores</h2>
                        {opportunities.length > 0 && (
                            <button className="btn-export" onClick={() => exportCSV(opportunities, 'opportunities.csv')}>
                                Download scoring CSV
                            </button>
                        )}
                    </div>
                    <div className="opportunity-section">
                        <button className="btn-primary" onClick={handleScoreOpportunities} disabled={scoringOpportunities}>
                            {scoringOpportunities ? 'Scoring…' : 'Rank by overall score'}
                        </button>
                        {opportunities.length > 0 && (
                            <>
                                <OpportunityScoringChart opportunities={opportunities} />
                                <div className="opportunities-list">
                                    <h4>Top graded products</h4>
                                    {opportunities.slice(0, 8).map((opp, idx) => (
                                        <div key={idx} className="opportunity-card">
                                            <strong>{opp.name}</strong>
                                            <span className="opp-score">{opp.grade} · {opp.opportunity_score}</span>
                                            <div className="opp-details">
                                                <span>{opp.collection}</span>
                                            </div>
                                            {opp.reasoning && <p className="opp-reasoning">{opp.reasoning}</p>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </section>
            )}

            {activeTab === 'suppliers' && (
                <section className="tab-content">
                    <div className="tab-title-row">
                        <h2>Supplier metrics</h2>
                        {suppliers.suppliers && (
                            <button className="btn-export" onClick={() => exportCSV(suppliers.suppliers, 'suppliers.csv')}>
                                Download suppliers
                            </button>
                        )}
                    </div>
                    <p>Track US based, lead/delivery time, and support quality. Fast US shipping scores 4–5 on the shipping band.</p>
                    {suppliers.suppliers && (
                        <div className="suppliers-grid">
                            {suppliers.suppliers.map((supplier) => (
                                <div key={supplier.supplier_id} className="supplier-card">
                                    <h3>{supplier.name}</h3>
                                    <div className="supplier-info">
                                        <div><strong>Region:</strong> {supplier.region}</div>
                                        <div><strong>US based:</strong> {/usa|u\.s\.|united states|\bus\b/i.test(String(supplier.region || '')) ? 'Y' : 'N'}</div>
                                        <div><strong>Lead time:</strong> {supplier.lead_time} days</div>
                                        <div><strong>Support / quality:</strong> <span className="score-badge">{supplier.score}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'tools' && (
                <section className="tab-content">
                    <h2>Tools</h2>
                    <RevenueGoalPlanner products={launchCatalog} />
                    <MarginCalculator />
                    <ResearchNotes apiBase={API_BASE} products={fullProducts} />
                    <AIChat />
                </section>
            )}
        </main>
    );
}

export default App;
