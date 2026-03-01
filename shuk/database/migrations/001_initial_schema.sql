-- =============================================================================
-- Shuk.io — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE period_type AS ENUM ('annual', 'quarterly');
CREATE TYPE dividend_type AS ENUM ('regular', 'special', 'return_of_capital');

-- =============================================================================
-- COMPANIES
-- =============================================================================

CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(10)  NOT NULL UNIQUE,
    name_he         TEXT         NOT NULL,
    name_en         TEXT,
    sector          VARCHAR(100),
    industry        VARCHAR(100),
    market_cap_ils  BIGINT,
    description_he  TEXT,
    listing_date    DATE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_companies_symbol   ON companies (symbol);
CREATE INDEX ix_companies_sector   ON companies (sector);
CREATE INDEX ix_companies_market_cap ON companies (market_cap_ils DESC NULLS LAST);

-- =============================================================================
-- FINANCIAL STATEMENTS
-- =============================================================================

CREATE TABLE financial_statements (
    id                    SERIAL PRIMARY KEY,
    company_id            INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_type           period_type  NOT NULL,
    period_end            DATE         NOT NULL,

    -- Income Statement
    revenue               BIGINT,
    gross_profit          BIGINT,
    operating_income      BIGINT,
    net_income            BIGINT,
    ebitda                BIGINT,
    eps                   NUMERIC(12, 4),

    -- Balance Sheet
    total_assets          BIGINT,
    total_equity          BIGINT,
    total_debt            BIGINT,
    cash_and_equivalents  BIGINT,

    -- Cash Flow
    operating_cash_flow   BIGINT,
    capex                 BIGINT,
    free_cash_flow        BIGINT,

    source_url            TEXT,
    fetched_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (company_id, period_type, period_end)
);

CREATE INDEX ix_fin_stmt_company_period
    ON financial_statements (company_id, period_type, period_end DESC);

-- =============================================================================
-- HISTORICAL PRICES
-- =============================================================================

CREATE TABLE historical_prices (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    trade_date      DATE         NOT NULL,
    open_price      NUMERIC(12, 4),
    high_price      NUMERIC(12, 4),
    low_price       NUMERIC(12, 4),
    close_price     NUMERIC(12, 4),
    adjusted_close  NUMERIC(12, 4),
    volume          BIGINT,

    UNIQUE (company_id, trade_date)
);

CREATE INDEX ix_price_company_date
    ON historical_prices (company_id, trade_date DESC);

-- =============================================================================
-- DIVIDENDS
-- =============================================================================

CREATE TABLE dividends (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ex_date         DATE           NOT NULL,
    payment_date    DATE,
    amount_ils      NUMERIC(12, 4) NOT NULL,
    dividend_yield  NUMERIC(6, 4),
    dividend_type   dividend_type  NOT NULL DEFAULT 'regular'
);

CREATE INDEX ix_dividend_company_exdate
    ON dividends (company_id, ex_date DESC);

-- =============================================================================
-- UPDATED_AT TRIGGER (companies)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
