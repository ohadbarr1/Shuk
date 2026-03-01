# Shuk.io 📈

**TASE Fundamental Research Platform** — Professional stock analysis for the Israeli market.

Inspired by StockUnlock & Qualtrim. Built for Israeli investors.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 · TypeScript · Tailwind CSS · Recharts |
| Backend | Python 3.11 · FastAPI · Pandas · NumPy |
| Database | PostgreSQL 15 · SQLAlchemy · asyncpg · Alembic |
| Data Source | TASE Data Hub API |
| Dev Environment | Docker Compose |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)
- TASE Data Hub API key

### 1. Clone & configure

```bash
git clone https://github.com/your-org/shuk.git
cd shuk
cp .env.example .env
# Fill in TASE_API_KEY and DATABASE_URL in .env
```

### 2. Start all services

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

### 3. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Populate data from TASE

```bash
docker compose exec backend python scripts/run_pipeline.py --all
```

---

## Development

### Backend only

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

### Run backend tests

```bash
cd backend
pytest tests/ -v
```

---

## Project Structure

```
shuk/
├── frontend/                  Next.js app
│   └── src/
│       ├── app/               App Router pages
│       ├── components/        React components
│       └── lib/               API client, utilities
├── backend/                   FastAPI app
│   ├── app/
│   │   ├── api/v1/            REST endpoints
│   │   ├── core/              Config, settings
│   │   ├── db/                Models, database session
│   │   ├── engine/            DCF & metrics calculations
│   │   └── services/          TASE pipeline services
│   ├── scripts/               CLI data pipeline runner
│   └── tests/                 Unit tests
├── database/
│   ├── migrations/            SQL schema files
│   └── seeds/                 Seed data
└── docker-compose.yml
```

---

## Coding Plan

See [`PLAN.md`](./PLAN.md) for the full 5-phase implementation plan including:
- Database schema design
- TASE API rate-limiting strategy
- Financial metrics & DCF engine
- Frontend component architecture
