# Shuk.io — Master Coding Plan

> TASE Fundamental Research Platform
> Inspired by StockUnlock & Qualtrim — built for the Israeli market.

---

## Architecture Overview

```
shuk/
├── frontend/          Next.js 14 (App Router) · TypeScript · Tailwind · Recharts
├── backend/           Python 3.11 · FastAPI · Pandas · SQLAlchemy · asyncpg
├── database/          PostgreSQL schema migrations & seed scripts
└── docker-compose.yml Dev environment (Postgres + backend + frontend)
```

### Data Flow
```
TASE Data Hub API
      │  (rate-limited: 10 req / 2 s)
      ▼
 Python Pipeline  ──► PostgreSQL ──► FastAPI REST
                                          │
                                     Next.js frontend
                                     (Recharts, DCF widget, Screener)
```

---

## Phase 1 — Project Initialization & Infrastructure

**Goal:** Running skeleton — frontend, backend, and CORS wired together.

### Tasks
1. Initialize Next.js 14 frontend (`create-next-app`) with:
   - TypeScript strict mode
   - Tailwind CSS
   - App Router (`app/` directory)
   - Path aliases (`@/` → `src/`)
2. Initialize FastAPI backend with:
   - `app/main.py` — app entry point, CORS middleware, router mount
   - `app/core/config.py` — `pydantic-settings` config (env vars)
   - `/health` GET endpoint returning `{ "status": "ok" }`
3. `docker-compose.yml` — Postgres 15 + backend + frontend services
4. `.env.example` files for both frontend and backend
5. `README.md` with setup instructions

### Acceptance Criteria
- `docker compose up` starts all three services
- `GET /health` returns 200
- Frontend home page renders without errors
- Frontend can `fetch('/api/health')` and display the status

---

## Phase 2 — Database Schema (PostgreSQL)

**Goal:** Normalized schema that can hold all TASE fundamental data.

### Entities & Key Columns

```sql
companies
  id SERIAL PK, symbol VARCHAR(10) UNIQUE, name_he TEXT, name_en TEXT,
  sector TEXT, industry TEXT, market_cap_ils BIGINT, description_he TEXT,
  listing_date DATE, is_active BOOLEAN DEFAULT TRUE, updated_at TIMESTAMPTZ

financial_statements
  id SERIAL PK, company_id FK→companies, period_type ENUM('annual','quarterly'),
  period_end DATE, revenue BIGINT, gross_profit BIGINT, operating_income BIGINT,
  net_income BIGINT, ebitda BIGINT, eps NUMERIC(12,4),
  total_assets BIGINT, total_equity BIGINT, total_debt BIGINT,
  cash_and_equivalents BIGINT, operating_cash_flow BIGINT,
  capex BIGINT, free_cash_flow BIGINT,
  source_url TEXT, fetched_at TIMESTAMPTZ

historical_prices
  id SERIAL PK, company_id FK→companies, trade_date DATE,
  open_price NUMERIC(12,4), high_price NUMERIC(12,4), low_price NUMERIC(12,4),
  close_price NUMERIC(12,4), volume BIGINT, adjusted_close NUMERIC(12,4)
  UNIQUE(company_id, trade_date)

dividends
  id SERIAL PK, company_id FK→companies, ex_date DATE, payment_date DATE,
  amount_ils NUMERIC(12,4), dividend_yield NUMERIC(6,4),
  dividend_type ENUM('regular','special','return_of_capital')
```

### Indexes
- `historical_prices(company_id, trade_date DESC)` — time-series queries
- `financial_statements(company_id, period_type, period_end DESC)`
- `dividends(company_id, ex_date DESC)`

### Tasks
1. Write `database/migrations/001_initial_schema.sql`
2. Write SQLAlchemy ORM models in `backend/app/db/models.py`
3. Write `backend/app/db/database.py` — async engine + session factory
4. Alembic setup for future migrations

---

## Phase 3 — TASE API Integration (Data Pipeline)

**Goal:** Populate the database from TASE Data Hub API without hitting rate limits.

### CRITICAL Constraint
TASE API: **10 requests per 2 seconds**. All HTTP calls MUST go through a
rate-limiter. Strategy: `asyncio.Semaphore` + `asyncio.sleep` backoff.

```python
# Pseudocode for rate-limited client
class TASEClient:
    _semaphore = asyncio.Semaphore(10)   # max 10 concurrent
    _window = 2.0                         # seconds

    async def get(self, url):
        async with self._semaphore:
            resp = await self._http.get(url)
            if resp.status_code == 429:
                await asyncio.sleep(self._window * 2)  # back off
                return await self.get(url)             # retry once
            return resp
```

### TASE Data Hub Endpoints (examples)
| Data | Endpoint |
|------|----------|
| Company list | `GET /api/companies` |
| Financial reports | `GET /api/companies/{id}/financials` |
| Historical prices | `GET /api/companies/{id}/prices` |
| Dividends | `GET /api/companies/{id}/dividends` |

> Actual endpoints must be confirmed from the TASE Data Hub documentation.
> Base URL: `https://api.tase.co.il/api/` (verify with official docs).

### Tasks
1. `backend/app/services/tase_client.py` — rate-limited async HTTP client
2. `backend/app/services/company_pipeline.py` — fetch + upsert companies
3. `backend/app/services/financials_pipeline.py` — fetch + upsert statements
4. `backend/app/services/prices_pipeline.py` — fetch + upsert daily prices
5. `backend/app/services/dividends_pipeline.py` — fetch + upsert dividends
6. CLI runner script `backend/scripts/run_pipeline.py` (click-based)
7. Error handling: log failed symbols, write to `failed_symbols.json`, continue

### Pipeline Run Order
```
1. companies       (once, ~500 symbols)
2. historical_prices  (bulk, throttled, ~250k rows)
3. financial_statements (quarterly + annual)
4. dividends
```

---

## Phase 4 — Financial Engine (Backend Logic)

**Goal:** Dynamic metric calculations on top of stored data.

### Metrics to Implement (Pandas-based)

| Metric | Formula | Notes |
|--------|---------|-------|
| Revenue CAGR | `(end/start)^(1/n) - 1` | n = years |
| EPS Growth | same CAGR pattern | |
| Gross Margin | `gross_profit / revenue` | |
| Operating Margin | `operating_income / revenue` | |
| Net Margin | `net_income / revenue` | |
| ROIC | `NOPAT / invested_capital` | `NOPAT = operating_income*(1-tax_rate)` |
| FCF Yield | `FCF / market_cap` | |
| Dividend Yield | from `dividends` table | trailing 12 months |
| P/E Ratio | `price / EPS` | latest close price |
| EV/EBITDA | `(market_cap + debt - cash) / EBITDA` | |

### DCF Calculator Function
```python
def dcf(
    base_fcf: float,
    growth_rates: list[float],   # e.g. [0.20, 0.18, 0.15, 0.12, 0.10]
    terminal_growth: float,      # e.g. 0.03
    discount_rate: float,        # WACC, e.g. 0.10
    terminal_multiple: float,    # e.g. 15x
    shares_outstanding: int,
) -> dict:
    """Returns: { intrinsic_value, upside_pct, projected_fcfs, terminal_value }"""
```

### FastAPI Endpoints (Phase 4)
```
GET  /api/v1/companies                    — list + search + filter
GET  /api/v1/companies/{symbol}           — company detail + latest metrics
GET  /api/v1/companies/{symbol}/metrics   — computed fundamental metrics
GET  /api/v1/companies/{symbol}/dcf       — DCF with query params
GET  /api/v1/companies/{symbol}/prices    — historical prices (date range)
GET  /api/v1/companies/{symbol}/dividends — dividend history
GET  /api/v1/screener                     — filter by metric thresholds
```

### Tasks
1. `backend/app/engine/metrics.py` — all ratio/growth calculations
2. `backend/app/engine/dcf.py` — DCF engine function + scenario builder
3. `backend/app/api/v1/endpoints/companies.py` — company routes
4. `backend/app/api/v1/endpoints/screener.py` — screener route
5. Pydantic response schemas in `backend/app/api/v1/schemas.py`
6. Unit tests in `backend/tests/` for every engine function

---

## Phase 5 — Frontend UI/UX & Data Visualization

**Goal:** Polished dashboard, DCF widget, and Screener.

### Pages & Routes

```
/                     → Landing page (search bar, featured companies)
/company/[symbol]     → Company dashboard
/screener             → Stock screener
/dcf/[symbol]         → Full DCF calculator (premium)
```

### Company Dashboard Components
```
<FinancialSummaryCards>   — Revenue, Net Income, FCF, ROIC chips
<RevenueChart>            — 10-year bar chart (revenue + net income)
<MarginsChart>            — Line chart: gross/operating/net margins
<FCFChart>                — FCF vs CapEx over years
<DividendHistoryTable>    — ex-date, amount, yield
<PriceChart>              — 1Y/3Y/5Y line chart with volume bars
```

### DCF Widget
- Range sliders for: discount rate (5–20%), growth rates (years 1–5), terminal multiple
- Real-time recalculation on slider change (debounced 200ms)
- Output: intrinsic value, upside/downside %, sensitivity table

### Screener Filters
- Market Cap (range slider, ILS billions)
- P/E Ratio (range)
- Dividend Yield (min %)
- Sector (multi-select)
- Revenue Growth CAGR (min %)
- Net Margin (min %)

### Recharts Usage Notes
- All charts use responsive containers (`<ResponsiveContainer width="100%">`)
- Currency formatting: ILS (₪) with locale `he-IL`
- Dark mode support via Tailwind `dark:` classes
- RTL support for Hebrew labels (CSS `direction: rtl`)

### Tasks
1. `frontend/src/lib/api.ts` — typed API client wrapping `fetch`
2. `frontend/src/app/page.tsx` — landing page with search
3. `frontend/src/app/company/[symbol]/page.tsx` — dashboard
4. `frontend/src/app/screener/page.tsx` — screener
5. `frontend/src/components/charts/` — all Recharts chart components
6. `frontend/src/components/dcf/DCFWidget.tsx` — interactive DCF
7. `frontend/src/components/screener/ScreenerTable.tsx` — filterable table

---

## Environment Variables

### Backend (`.env`)
```
DATABASE_URL=postgresql+asyncpg://shuk:shuk@localhost:5432/shuk
TASE_API_KEY=<from TASE Data Hub registration>
TASE_API_BASE_URL=https://api.tase.co.il/api
CORS_ORIGINS=http://localhost:3000
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development Sequence

```
Phase 1  →  docker compose up → health check passes
Phase 2  →  alembic upgrade head → tables created
Phase 3  →  python scripts/run_pipeline.py → DB populated with TASE data
Phase 4  →  pytest backend/tests/ → all metric/DCF tests pass
Phase 5  →  npm run dev → dashboard renders with real data
```

---

## File Checklist (to be created during implementation)

### Root
- [ ] `docker-compose.yml`
- [ ] `.env.example`
- [ ] `README.md`

### Backend
- [ ] `backend/pyproject.toml` (or `requirements.txt`)
- [ ] `backend/app/main.py`
- [ ] `backend/app/core/config.py`
- [ ] `backend/app/db/database.py`
- [ ] `backend/app/db/models.py`
- [ ] `backend/app/services/tase_client.py`
- [ ] `backend/app/services/company_pipeline.py`
- [ ] `backend/app/services/financials_pipeline.py`
- [ ] `backend/app/services/prices_pipeline.py`
- [ ] `backend/app/services/dividends_pipeline.py`
- [ ] `backend/app/engine/metrics.py`
- [ ] `backend/app/engine/dcf.py`
- [ ] `backend/app/api/v1/endpoints/companies.py`
- [ ] `backend/app/api/v1/endpoints/screener.py`
- [ ] `backend/app/api/v1/schemas.py`
- [ ] `backend/app/api/v1/router.py`
- [ ] `backend/scripts/run_pipeline.py`
- [ ] `backend/tests/test_metrics.py`
- [ ] `backend/tests/test_dcf.py`
- [ ] `backend/alembic.ini`
- [ ] `backend/alembic/env.py`

### Frontend
- [ ] `frontend/package.json`
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/tailwind.config.ts`
- [ ] `frontend/src/lib/api.ts`
- [ ] `frontend/src/app/layout.tsx`
- [ ] `frontend/src/app/page.tsx`
- [ ] `frontend/src/app/company/[symbol]/page.tsx`
- [ ] `frontend/src/app/screener/page.tsx`
- [ ] `frontend/src/components/charts/RevenueChart.tsx`
- [ ] `frontend/src/components/charts/MarginsChart.tsx`
- [ ] `frontend/src/components/charts/FCFChart.tsx`
- [ ] `frontend/src/components/charts/PriceChart.tsx`
- [ ] `frontend/src/components/dcf/DCFWidget.tsx`
- [ ] `frontend/src/components/screener/ScreenerTable.tsx`

### Database
- [ ] `database/migrations/001_initial_schema.sql`
- [ ] `database/seeds/companies_seed.sql`
