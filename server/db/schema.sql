CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    display_order INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    source_product_id TEXT NOT NULL,
    upc TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    product_price NUMERIC(10, 2) NOT NULL,
    supplier_cost NUMERIC(10, 2) NOT NULL,
    shipping_cost NUMERIC(10, 2) NOT NULL,
    competitor_price NUMERIC(10, 2) NOT NULL,
    estimated_margin NUMERIC(6, 2) NOT NULL,
    market_score NUMERIC(6, 2) NOT NULL,
    competition_score NUMERIC(6, 2) NOT NULL,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    case_pack_quantity INTEGER NOT NULL DEFAULT 1,
    per_piece_weight NUMERIC(10, 4) NOT NULL DEFAULT 0,
    shortlist_ready BOOLEAN NOT NULL DEFAULT FALSE,
    shortlist_reason TEXT,
    consumer_behavior_note TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_products_source UNIQUE (source, source_product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_market_score ON products (market_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_shortlist_ready ON products (shortlist_ready);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    external_supplier_id TEXT,
    name TEXT NOT NULL UNIQUE,
    region TEXT,
    lead_time_days INTEGER,
    quality_score NUMERIC(6, 2),
    shipping_cost_avg NUMERIC(10, 2) NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual',
    raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_notes (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    title TEXT NOT NULL,
    note TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    source TEXT NOT NULL DEFAULT 'dashboard',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_notes_created_at ON research_notes (created_at DESC);